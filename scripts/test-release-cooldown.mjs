/** Reproduce release-age behavior using actual pnpm and the market bridge. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { verifyInstall } from './verify-release-install.mjs'
const [runtime, desktopExecutable, pnpm, marketBridge, archive, priorArchive] = process.argv.slice(2).map(value => path.resolve(value))
if (![runtime, desktopExecutable, pnpm, marketBridge, archive].every(Boolean)) throw Error('Pass runtime, desktop executable, bundled pnpm, market bridge and archive')
const output = path.resolve('output/release-cooldown-verification')
fs.mkdirSync(output, { recursive: true })
const scratch = fs.mkdtempSync(path.join(output, 'fixture-'))
const readManifest = file => {
  const result = spawnSync('tar', ['-xOf', file, 'package/package.json'], { encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}
const pkg = readManifest(archive)
const integrity = 'sha512-' + createHash('sha512').update(fs.readFileSync(archive)).digest('base64')
const prior = priorArchive ? readManifest(priorArchive) : undefined
if (prior) { assert.equal(prior.name, pkg.name); assert.notEqual(prior.version, pkg.version) }
const priorIntegrity = priorArchive ? 'sha512-' + createHash('sha512').update(fs.readFileSync(priorArchive)).digest('base64') : undefined
const depDir = path.join(scratch, 'clsx')
fs.mkdirSync(depDir)
fs.cpSync(fs.realpathSync('node_modules/clsx'), path.join(depDir, 'package'), { recursive: true })
const dependencyArchive = path.join(scratch, 'clsx.tgz')
assert.equal(spawnSync('tar', ['-czf', dependencyArchive, '-C', depDir, 'package'], { windowsHide: true }).status, 0)
const dependency = readManifest(dependencyArchive)
const dependencyIntegrity = 'sha512-' + createHash('sha512').update(fs.readFileSync(dependencyArchive)).digest('base64')
let base
let mature = false
const server = createServer((req, res) => {
  const segments = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).split('/').filter(Boolean)
  const key = segments.join('/')
  const bundle = key.startsWith('clsx') ? dependency : pkg
  const tarball = bundle === pkg ? archive : dependencyArchive
  if (key === bundle.name) {
    const published = bundle === dependency ? '2020-01-01T00:00:00.000Z' : new Date(Date.now() - (mature ? 25 * 60 * 60 * 1000 : 60 * 1000)).toISOString()
    const tarballUrl = base + bundle.name + '/-/' + bundle.name + '-' + bundle.version + '.tgz'
    res.writeHead(200, { 'content-type': 'application/json' })
    const metadata = { name: bundle.name, 'dist-tags': { latest: bundle.version, next: bundle.version },
      time: { [bundle.version]: published },
      versions: { [bundle.version]: { ...bundle, dist: { tarball: tarballUrl, integrity: bundle === pkg ? integrity : dependencyIntegrity } } } }
    if (bundle === pkg && prior) {
      metadata.time[prior.version] = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      metadata.versions[prior.version] = { ...prior, dist: { tarball: base + prior.name + '/-/' + prior.name + '-' + prior.version + '.tgz', integrity: priorIntegrity } }
    }
    res.end(JSON.stringify(metadata))
  } else if (prior && key === prior.name + '/-/' + prior.name + '-' + prior.version + '.tgz') {
    res.writeHead(200, { 'content-length': fs.statSync(priorArchive).size, 'content-type': 'application/octet-stream' })
    fs.createReadStream(priorArchive).pipe(res)
  } else if (key === bundle.name + '/-/' + bundle.name + '-' + bundle.version + '.tgz') {
    res.writeHead(200, { 'content-length': fs.statSync(tarball).size, 'content-type': 'application/octet-stream' })
    fs.createReadStream(tarball).pipe(res)
  } else { res.writeHead(404); res.end('Not in fixture') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
base = 'http://127.0.0.1:' + server.address().port + '/'
const cases = [
  { name: 'fresh bare name', target: pkg.name, blocked: true },
  { name: 'fresh exact version', target: pkg.name + '@' + pkg.version, blocked: true },
  { name: 'fresh registry tgz URL', target: base + pkg.name + '/-/' + pkg.name + '-' + pkg.version + '.tgz', blocked: true },
  { name: 'non-strict defaults can add an exemption', target: pkg.name + '@' + pkg.version, normal: true, repeat: true, blocked: false },
  { name: 'explicit non-strict policy can add an exemption', target: pkg.name + '@' + pkg.version, strict: false, repeat: true, blocked: false },
  { name: 'only this exact version is exempted', target: pkg.name + '@' + pkg.version, exclude: true, repeat: true, blocked: false },
  { name: '25 hours clears the 24-hour policy', target: pkg.name + '@' + pkg.version, mature: true, repeat: true, blocked: false },
  { name: '25 hours does not clear a custom 48-hour policy', target: pkg.name + '@' + pkg.version, mature: true, age: 2880, blocked: true },
  { name: 'reviewed local archive under strict policy', target: pkg.name + '@file:' + archive.replaceAll('\\', '/'), blocked: false },
  ...(prior ? [{ name: 'upgrade followed by identical version reinstall', target: pkg.name + '@' + pkg.version,
    seed: { spec: prior.name + '@' + prior.version, version: prior.version }, normal: true, repeat: true, repeatBlocked: true, blocked: false }] : []),
]
const results = []
try {
  for (const scenario of cases) {
    mature = scenario.mature === true
    const result = await verifyInstall({ runtime, desktopExecutable, pnpm, marketBridge,
      registry: base, spec: scenario.target, version: pkg.version,
      normal: scenario.normal, exclude: scenario.exclude, age: scenario.age, strict: scenario.strict, repeat: scenario.repeat, seed: scenario.seed })
    assert.equal(result.status, scenario.blocked ? 'blocked' : 'passed', scenario.name + ': ' + JSON.stringify(result.result))
    if (scenario.blocked) assert.equal(result.releaseAgeBlocked, true, scenario.name + ' should fail on release age')
    if (!scenario.normal && !scenario.exclude && scenario.strict !== false) assert.deepEqual(result.exclusions, [], scenario.name + ' must not add an exemption')
    if (scenario.normal || scenario.exclude || scenario.strict === false) assert.deepEqual(result.exclusions, [...(scenario.seed ? [scenario.seed.spec] : []), pkg.name + '@' + pkg.version])
    if (result.repeat) {
      assert.equal(result.repeat.status, scenario.repeatBlocked ? 'blocked' : 'passed', scenario.name + ': repeated install status')
      assert.equal(result.repeat.installedVersionPreserved, true, scenario.name + ': installed version survives repeat')
      assert.equal(result.repeat.bundleSelectionPreserved, true, scenario.name + ': bundle selection survives repeat')
      assert.equal(result.repeat.dependencyPreserved, true, scenario.name + ': dependency survives repeat')
      assert.deepEqual(result.repeat.exclusions, result.exclusions, scenario.name + ': repeat preserves exemptions')
      if (result.repeat.status === 'blocked') assert.equal(result.repeat.releaseAgeCode, 'ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION', scenario.name + ': identify lockfile age rejection')
      console.log(scenario.name + ' repeated: ' + result.repeat.status + ' ' + result.repeat.releaseAgeCode)
    }
    results.push({ ...result, scenario: scenario.name })
    console.log(scenario.name + ': verified')
  }
  const receipt = { status: 'passed', fixtureRegistry: true, version: pkg.version, cases: results }
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(receipt, null, 2) + '\n')
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
