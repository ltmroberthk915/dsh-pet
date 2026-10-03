/** Publish a verified archive to next, preserving the existing latest tag. */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { PACKAGE, OFFICIAL_REGISTRY } from './release-channel.mjs'

const [archiveArg] = process.argv.slice(2)
if (!archiveArg) throw Error('Usage: node scripts/stage-release.mjs <verified.tgz>')
const archive = path.resolve(archiveArg)
const manifest = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], { encoding: 'utf8', windowsHide: true }))
if (manifest.name !== PACKAGE || !/^\d+\.\d+\.\d+$/.test(manifest.version) || manifest.scripts || manifest.devDependencies || manifest.packageManager) throw Error('Expected a precompiled release archive without lifecycle hooks')
const npm = process.env.DSH_PET_NPM_CLI || fs.realpathSync(path.join(process.execPath, process.platform === 'win32' ? '../node_modules/npm/bin/npm-cli.js' : '../npm'))
const flags = ['--registry=' + OFFICIAL_REGISTRY, '--fetch-retries=0', '--prefer-online']
const run = args => execFileSync(process.execPath, [npm, ...args, ...flags], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 * 1024 })
const read = (spec, ...fields) => {
  try { return JSON.parse(run(['view', spec, ...fields, '--json', '--fetch-timeout=30000'])) }
  catch (error) {
    let code
    try { code = JSON.parse(error.stdout)?.error?.code } catch {}
    if (code === 'E404') return null
    throw Error('Official npm query failed: ' + (code || error.code || error.message))
  }
}
const integrity = 'sha512-' + createHash('sha512').update(fs.readFileSync(archive)).digest('base64')
const before = read(PACKAGE, 'dist-tags') ?? {}
const spec = PACKAGE + '@' + manifest.version
const existing = read(spec)
if (existing) {
  if (existing.dist?.integrity !== integrity) throw Error('This immutable version exists with different bytes')
  console.log('Exact archive already published; preserving all existing tags.')
} else {
  console.log('Publishing ' + spec + ' to next; latest before publication: ' + (before.latest ?? '(absent)'))
  execFileSync(process.execPath, [npm, 'publish', archive, '--access=public', '--tag=next', '--ignore-scripts', '--loglevel=warn', '--fetch-timeout=3600000', ...flags], { windowsHide: true, stdio: 'inherit' })
}
let published
for (let attempt = 0; attempt < 40; attempt++) {
  published = read(spec)
  if (published) break
  await new Promise(resolve => setTimeout(resolve, 15000))
}
if (!published || published.dist?.integrity !== integrity) throw Error('Official npm has not confirmed the exact uploaded archive')
const after = read(PACKAGE, 'dist-tags') ?? {}
const initialDefault = before.latest == null && after.latest === manifest.version
if (!initialDefault && (after.latest ?? null) !== (before.latest ?? null)) throw Error('latest changed during publication; inspect before taking any further action')
if (!existing && after.next !== manifest.version) throw Error('The next tag does not match the uploaded version')
const receipt = { status: 'published', name: PACKAGE, version: manifest.version, registry: OFFICIAL_REGISTRY, integrity, tags: after, latestBefore: before.latest ?? null, initialDefault, publishedAt: published.time?.[manifest.version], checkedAt: new Date().toISOString() }
fs.mkdirSync('output', { recursive: true })
fs.writeFileSync('output/npm-publication.json', JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify(receipt, null, 2))
