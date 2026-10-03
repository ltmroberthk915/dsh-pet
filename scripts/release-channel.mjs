/** Publisher-only channel guard; never a consumer lifecycle hook. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

export const PACKAGE = 'dsh-pet-copilot'
export const MIN_AGE_MS = 24 * 60 * 60 * 1000
export const OFFICIAL_REGISTRY = 'https://registry.npmjs.org'
const REPOSITORY = 'https://github.com/ltmroberthk915/dsh-pet'
export function queryRegistry(operation, environment = process.env) {
  const raw = operation === 'check' ? environment.DSH_PET_REGISTRY || OFFICIAL_REGISTRY : OFFICIAL_REGISTRY
  const url = new URL(raw)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw Error('Invalid registry URL')
  const registry = url.href.replace(/\/$/, '')
  return { registry, authoritative: registry === OFFICIAL_REGISTRY }
}
export function releaseReadiness(metadata, version, now = Date.now()) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('An exact stable version is required')
  const manifest = metadata.versions?.[version]
  if (manifest?.name !== PACKAGE || manifest.version !== version) throw Error('The published package identity does not match')
  const repository = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url
  if (repository?.replace(/^git\+/, '').replace(/\.git$/, '').replace(/\/$/, '') !== REPOSITORY) throw Error('Published repository identity does not match')
  if (typeof manifest.dist?.integrity !== 'string' || !manifest.dist.integrity.startsWith('sha512-')) throw Error('Published integrity is missing')
  const publishedAt = Date.parse(metadata.time?.[version])
  if (!Number.isFinite(publishedAt) || publishedAt > now) throw Error('Invalid publication time')
  const latest = metadata['dist-tags']?.latest
  if (latest && /^\d+\.\d+\.\d+$/.test(latest)) {
    const a = version.split('.').map(Number), b = latest.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      if (a[i] < b[i]) throw Error('Refusing to move latest backwards')
      if (a[i] > b[i]) break
    }
  }
  const eligibleAt = publishedAt + MIN_AGE_MS
  return { package: PACKAGE, version, ready: now >= eligibleAt, publishedAt: new Date(publishedAt).toISOString(),
    eligibleAt: new Date(eligibleAt).toISOString(), remainingSeconds: Math.max(0, Math.ceil((eligibleAt - now) / 1000)),
    integrity: manifest.dist.integrity, latest: latest ?? null }
}

export function validatePromotion(receipt, verdict) {
  if (!verdict.ready) throw Error('The release has not completed the 24-hour wait')
  if (receipt?.status !== 'passed' || receipt.registry !== 'https://registry.npmjs.org' || receipt.name !== PACKAGE ||
      receipt.version !== verdict.version || receipt.integrity !== verdict.integrity || receipt.minimumReleaseAge < 1440 ||
      receipt.exclusions?.length !== 0 || receipt.source !== 'registry' || receipt.strict !== true ||
      !Number.isFinite(Date.parse(receipt.checkedAt)) || Date.parse(receipt.checkedAt) < Date.parse(verdict.eligibleAt)) {
    throw Error('A successful strict registry-install receipt after the cooldown is required')
  }
}

// npm creates latest for a new package and refuses to remove it. A staged
// first publication must replace the generated empty 0.0.0-stage default.
// Existing stable releases still go through the strict 24-hour promotion gate.
export function validateInitialLatest(receipt, verdict, publishedVersions) {
  if (!Array.isArray(publishedVersions) || !publishedVersions.includes(verdict.version) ||
      publishedVersions.some(version => version !== verdict.version && version !== '0.0.0-stage') ||
      ![null, '0.0.0-stage', verdict.version].includes(verdict.latest)) {
    throw Error('Initial latest can only initialize the first real published version')
  }
  if (receipt?.status !== 'passed' || receipt.registry !== OFFICIAL_REGISTRY || receipt.name !== PACKAGE ||
      receipt.version !== verdict.version || receipt.installedVersion !== verdict.version ||
      receipt.integrity !== verdict.integrity || receipt.source !== 'registry' ||
      !Number.isFinite(Date.parse(receipt.checkedAt)) || Date.parse(receipt.checkedAt) < Date.parse(verdict.publishedAt) ||
      receipt.repeat?.status !== 'passed' || receipt.repeat.installedVersionPreserved !== true ||
      receipt.repeat.bundleSelectionPreserved !== true || receipt.repeat.dependencyPreserved !== true) {
    throw Error('A successful official fresh-install and reinstall receipt is required for initial latest')
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [operation, version, receiptFile] = process.argv.slice(2)
    if (!['check', 'promote', 'initialize-latest'].includes(operation)) throw Error('Usage: release-channel.mjs check <version> | promote <version> <strict-install-receipt.json> | initialize-latest <first-version> <official-install-receipt.json>')
    const npm = process.env.DSH_PET_NPM_CLI || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
    if (!fs.existsSync(npm)) throw Error('Run this publisher tool with Node.js and npm')
    const source = queryRegistry(operation)
    const flags = ['--registry=' + source.registry, '--fetch-retries=0', '--fetch-timeout=30000']
    const view = () => {
      try { return JSON.parse(execFileSync(process.execPath, [npm, 'view', PACKAGE + '@' + version, '--json', ...flags], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })) }
      catch (error) {
        let code
        try { code = JSON.parse(error.stdout)?.error?.code } catch {}
        throw Error('Registry query failed (' + source.registry + '): ' + (code || error.code || error.message))
      }
    }
    const manifest = view()
    const verdict = releaseReadiness({ ...manifest, versions: { [version]: manifest } }, version)
    console.log(JSON.stringify({ ...verdict, ...source }, null, 2))
    if (operation === 'check') {
      if (!verdict.ready) process.exitCode = 2
    } else {
      if (!receiptFile) throw Error('Pass the official registry-install receipt')
      const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'))
      const validate = (data, result) => operation === 'promote'
        ? validatePromotion(receipt, result)
        : validateInitialLatest(receipt, result, data.versions)
      validate(manifest, verdict)
      // Re-read immediately before mutating the tag: another publisher may have
      // advanced latest while the validation receipt was being produced.
      const current = view()
      const currentVerdict = releaseReadiness({ ...current, versions: { [version]: current } }, version)
      validate(current, currentVerdict)
      if (currentVerdict.latest !== version) execFileSync(process.execPath, [npm, 'dist-tag', 'add', PACKAGE + '@' + version, 'latest', ...flags], { stdio: 'inherit', windowsHide: true })
      const tags = JSON.parse(execFileSync(process.execPath, [npm, 'view', PACKAGE, 'dist-tags', '--json', ...flags], { encoding: 'utf8', windowsHide: true }))
      if (tags.latest !== version) throw Error('Registry latest did not match after promotion')
      console.log('Verified latest: ' + PACKAGE + '@' + version)
    }
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
