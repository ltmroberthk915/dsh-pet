/** Real DSH 0.2 manager + market bridge, against an isolated loopback registry. */
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const root = path.resolve(import.meta.dirname, '..')
const [runtime, support, previous, current, marketBridge] = process.argv.slice(2)
if (![runtime, support, previous, current, marketBridge].every(Boolean)) {
  throw Error('Usage: node scripts/test-market-install.mjs <prepared-dsh-runtime> <desktop-runtime-support> <old.tgz> <new.tgz> <dshmarket/lib/official-desktop.js>')
}
const output = path.join(root, 'output/market-install-verification')
fs.mkdirSync(output, { recursive: true })
const dir = fs.mkdtempSync(path.join(output, 'fresh-'))
const home = path.join(dir, 'dsh-home')
const releases = new Map()
for (const archive of [previous, current]) {
  const manifest = spawnSync('tar', ['-xOf', path.resolve(archive), 'package/package.json'], { encoding: 'utf8', windowsHide: true })
  assert.equal(manifest.status, 0, manifest.stderr)
  const pkg = JSON.parse(manifest.stdout)
  const hash = createHash('sha512')
  for await (const chunk of fs.createReadStream(archive)) hash.update(chunk)
  releases.set(pkg.version, { pkg, archive: path.resolve(archive), integrity: 'sha512-' + hash.digest('base64') })
}
const versions = [...releases.keys()]
assert.equal(versions.length, 2, 'Need two different versions to exercise upgrade')
const names = [...releases.values()].map(release => release.pkg.name)
const name = names[1]
// Serve the real, installed runtime dependency locally too: network retries
// must not masquerade as a plugin lifecycle regression.
const dependencyDir = path.join(dir, 'dependency')
fs.mkdirSync(dependencyDir)
fs.cpSync(fs.realpathSync(path.join(root, 'node_modules/clsx')), path.join(dependencyDir, 'package'), { recursive: true })
const dependencyArchive = path.join(dir, 'clsx.tgz')
const packed = spawnSync('tar', ['-czf', dependencyArchive, '-C', dependencyDir, 'package'], { windowsHide: true, encoding: 'utf8' })
assert.equal(packed.status, 0, packed.stderr)
const dependency = { pkg: JSON.parse(fs.readFileSync(path.join(dependencyDir, 'package/package.json'))), archive: dependencyArchive,
  integrity: 'sha512-' + createHash('sha512').update(fs.readFileSync(dependencyArchive)).digest('base64') }
let registry
const server = createServer((req, res) => {
  const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (requestPath === '/clsx') {
    const version = dependency.pkg.version
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ name: 'clsx', 'dist-tags': { latest: version }, time: { [version]: '2020-01-01T00:00:00.000Z' },
      versions: { [version]: { ...dependency.pkg, dist: { tarball: registry + 'clsx.tgz', integrity: dependency.integrity } } } })); return
  }
  if (requestPath === '/clsx.tgz') {
    res.writeHead(200, { 'content-type': 'application/octet-stream' }); fs.createReadStream(dependency.archive).pipe(res); return
  }
  const matching = [...releases].filter(([, release]) => requestPath === '/' + release.pkg.name)
  if (matching.length) {
    const metadata = { name: matching[0][1].pkg.name, 'dist-tags': { latest: matching.at(-1)[0] }, versions: {}, time: {} }
    for (const [version, release] of matching) {
      metadata.versions[version] = { ...release.pkg, dist: { tarball: registry + 'pet-' + version + '.tgz', integrity: release.integrity } }
      // Test fixture releases are aged; real publication still obeys the user's
      // minimumReleaseAge policy. No local or global exemption is installed.
      metadata.time[version] = '2020-01-01T00:00:00.000Z'
    }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(metadata)); return
  }
  const release = [...releases.values()].find(item => requestPath === '/pet-' + item.pkg.version + '.tgz')
  if (release) {
    res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': fs.statSync(release.archive).size })
    fs.createReadStream(release.archive).pipe(res); return
  }
  res.writeHead(404); res.end('Unlisted fixture dependency')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
registry = `http://127.0.0.1:${server.address().port}/`
const config = { runtime: path.resolve(runtime), support: path.resolve(support), home, name, names, versions, registry, currentArchive: path.resolve(current), marketBridge: path.resolve(marketBridge), dir }
fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config))
async function worker(mode) {
  const settings = mode === 'fresh-current' ? { ...config, home: path.join(dir, 'fresh-current-home') } : config
  const configFile = path.join(dir, mode + '-config.json')
  fs.writeFileSync(configFile, JSON.stringify(settings))
  const log = fs.createWriteStream(path.join(dir, mode + '.log'))
  const child = spawn(process.execPath, [path.join(root, 'scripts/test-market-install-worker.mjs'), configFile, mode], {
    cwd: root, windowsHide: true,
    env: { ...process.env, DSH_HOME: settings.home, DSH_TELEMETRY_DISABLED: '1' },
  })
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false })
  const timeout = setTimeout(() => child.kill(), 240000)
  try {
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve) })
    assert.equal(code, 0, mode + ' failed; inspect ' + path.join(dir, mode + '.log'))
  } finally { clearTimeout(timeout); log.end() }
}
try {
  await worker('install')
  await worker('restart')
  await worker('fresh-current')
  const result = { status: 'passed', fixtureRegistry: true, freshHome: home, names, versions,
    install: JSON.parse(fs.readFileSync(path.join(dir, 'install.json'))), restart: JSON.parse(fs.readFileSync(path.join(dir, 'restart.json'))),
    freshCurrent: JSON.parse(fs.readFileSync(path.join(dir, 'fresh-current.json'))) }
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
