/** Install the consumer tarball with DSH's actual pnpm, in an empty profile. */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const [pnpm, source] = process.argv.slice(2)
if (!pnpm || !source) throw Error('Supply pnpm.mjs and the release archive or Git spec.')
const root = path.resolve(import.meta.dirname, '..'), output = path.join(root, 'output/precompiled-install-verification')
fs.mkdirSync(output, { recursive: true })
const dir = fs.mkdtempSync(path.join(output, 'profile-'))
fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'pet-clean-profile', private: true, version: '0.0.0' }))
// Keep restrictive pnpm 11 defaults. No build allowlist, shim or install hook.
fs.writeFileSync(path.join(dir, 'pnpm-workspace.yaml'), 'strictDepBuilds: true\n')
const result = spawnSync(process.execPath, [path.resolve(pnpm), 'add', path.isAbsolute(source) ? path.resolve(source) : source,
  '--registry=https://registry.npmjs.org', '--reporter=append-only'], { cwd: dir, windowsHide: true, encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 })
fs.writeFileSync(path.join(dir, 'install.log'), result.stdout + '\n' + result.stderr)
assert.equal(result.status, 0, result.stdout + result.stderr)
const installed = path.join(dir, 'node_modules/dsh-pet-copilot')
const manifest = JSON.parse(fs.readFileSync(path.join(installed, 'package.json')))
for (const hook of ['prepare', 'preinstall', 'install', 'postinstall', 'prepack']) assert.equal(manifest.scripts?.[hook], undefined)
if (!source.startsWith('git+')) assert.equal(manifest.packageManager, undefined)
const { runPetInvariants } = await import(pathToFileURL(path.join(installed, 'lib/invariant.js')))
runPetInvariants()
for (const file of ['lib/index.js', 'lib/client.js', 'lib/invariant.js', 'desktop/companion-main.cjs', 'desktop/companion-host.cjs', 'desktop/companion-runtime.cjs',
  'assets/whale-refined/pet.json', 'assets/miku/pet.json', 'assets/blue-whale-business/pet.json']) assert.ok(fs.statSync(path.join(installed, file)).size > 0, file)
assert.ok(!/ERR_PNPM_|needs to execute build scripts|Ignored build scripts/.test(result.stdout + result.stderr))
const report = { success: true, version: manifest.version, source, profile: dir, consumerBuilds: false, strictDepBuilds: true }
fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
