import test from 'node:test'
import assert from 'node:assert/strict'
import { releaseReadiness, validatePromotion, validateInitialLatest, queryRegistry, PACKAGE, MIN_AGE_MS } from './release-channel.mjs'
const at = Date.parse('2026-10-03T08:00:00.000Z')
const metadata = () => ({ versions: { '1.3.3': { name: PACKAGE, version: '1.3.3', repository: { url: 'git+https://github.com/ltmroberthk915/dsh-pet.git' }, dist: { integrity: 'sha512-test' } } }, time: { '1.3.3': new Date(at).toISOString() }, 'dist-tags': { next: '1.3.3', latest: '1.3.2' } })
test('promotion waits for the complete 24 hours, including first-name releases', () => {
  const data = metadata()
  assert.equal(releaseReadiness(data, '1.3.3', at + MIN_AGE_MS - 1).ready, false)
  assert.equal(releaseReadiness(data, '1.3.3', at + MIN_AGE_MS).ready, true)
  delete data['dist-tags'].latest
  assert.equal(releaseReadiness(data, '1.3.3', at).ready, false)
})
test('wrong identity, missing dates, future dates and downgrade are rejected', () => {
  const data = metadata()
  data['dist-tags'].latest = '1.4.0'
  assert.throws(() => releaseReadiness(data, '1.3.3', at + MIN_AGE_MS), /backwards/)
  delete data['dist-tags'].latest
  delete data.time['1.3.3']
  assert.throws(() => releaseReadiness(data, '1.3.3'), /publication time/)
  data.time['1.3.3'] = new Date(at).toISOString()
  assert.throws(() => releaseReadiness(data, '1.3.3', at - 1), /publication time/)
  data.versions['1.3.3'].name = 'another-package'
  assert.throws(() => releaseReadiness(data, '1.3.3', at), /identity/)
})
test('an exemption, local-file install or test-registry install cannot authorize promotion', () => {
  const verdict = releaseReadiness(metadata(), '1.3.3', at + MIN_AGE_MS)
  const receipt = { status: 'passed', registry: 'https://registry.npmjs.org', name: PACKAGE, version: '1.3.3', integrity: 'sha512-test', minimumReleaseAge: 1440, strict: true, exclusions: [], source: 'registry', checkedAt: new Date(at + MIN_AGE_MS).toISOString() }
  validatePromotion(receipt, verdict)
  for (const changed of [{ exclusions: [PACKAGE + '@1.3.3'] }, { source: 'file' }, { registry: 'http://127.0.0.1:1234' }, { checkedAt: new Date(at).toISOString() }, { minimumReleaseAge: 0 }, { strict: false }, { integrity: 'sha512-other' }]) {
    assert.throws(() => validatePromotion({ ...receipt, ...changed }, verdict), /strict registry-install receipt/)
  }
})
test('check can name a mirror while promotion always uses the official registry', () => {
  assert.deepEqual(queryRegistry('check', { DSH_PET_REGISTRY: 'https://registry.npmmirror.com/' }), { registry: 'https://registry.npmmirror.com', authoritative: false })
  assert.deepEqual(queryRegistry('promote', { DSH_PET_REGISTRY: 'https://registry.npmmirror.com' }), { registry: 'https://registry.npmjs.org', authoritative: true })
  assert.deepEqual(queryRegistry('initialize-latest', { DSH_PET_REGISTRY: 'https://registry.npmmirror.com' }), { registry: 'https://registry.npmjs.org', authoritative: true })
  assert.deepEqual(queryRegistry('check', {}), { registry: 'https://registry.npmjs.org', authoritative: true })
  assert.throws(() => queryRegistry('check', { DSH_PET_REGISTRY: 'https://user:password@example.com' }), /Invalid registry/)
})

const initialReceipt = () => ({ status: 'passed', registry: 'https://registry.npmjs.org', name: PACKAGE,
  version: '1.3.3', installedVersion: '1.3.3', integrity: 'sha512-test', source: 'registry',
  checkedAt: new Date(at + 1000).toISOString(),
  repeat: { status: 'passed', installedVersionPreserved: true, bundleSelectionPreserved: true, dependencyPreserved: true } })
const initialVerdict = () => {
  const data = metadata()
  data['dist-tags'].latest = '0.0.0-stage'
  return releaseReadiness(data, '1.3.3', at + 1000)
}
test('first published package can replace the npm staging placeholder only after real install and reinstall', () => {
  const verdict = initialVerdict()
  assert.equal(verdict.ready, false)
  validateInitialLatest(initialReceipt(), verdict, ['0.0.0-stage', '1.3.3'])
  validateInitialLatest(initialReceipt(), { ...verdict, latest: '1.3.3' }, ['1.3.3'])
  assert.throws(() => validatePromotion(initialReceipt(), verdict), /24-hour wait/)
})
test('initial latest cannot replace an existing release or hide earlier published versions', () => {
  const verdict = initialVerdict()
  for (const versions of [undefined, [], ['0.0.0-stage'], ['1.3.2', '1.3.3'], ['1.3.3-beta.1', '1.3.3']]) {
    assert.throws(() => validateInitialLatest(initialReceipt(), verdict, versions), /first real published version/)
  }
  assert.throws(() => validateInitialLatest(initialReceipt(), { ...verdict, latest: '1.3.2' }, ['1.3.3']), /first real published version/)
})
test('initial latest rejects fixture, stale, mismatched and failed reinstall evidence', () => {
  const receipt = initialReceipt(), verdict = initialVerdict(), versions = ['0.0.0-stage', '1.3.3']
  for (const changed of [{ source: 'file' }, { registry: 'http://127.0.0.1:1234' }, { integrity: 'sha512-other' },
    { checkedAt: new Date(at - 1).toISOString() }, { installedVersion: '1.3.2' },
    { repeat: { ...receipt.repeat, status: 'blocked' } }, { repeat: { ...receipt.repeat, dependencyPreserved: false } }]) {
    assert.throws(() => validateInitialLatest({ ...receipt, ...changed }, verdict, versions), /fresh-install and reinstall receipt/)
  }
})
