import test from 'node:test'
import assert from 'node:assert/strict'
import { releaseReadiness, validatePromotion, queryRegistry, PACKAGE, MIN_AGE_MS } from './release-channel.mjs'
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
  assert.deepEqual(queryRegistry('check', {}), { registry: 'https://registry.npmjs.org', authoritative: true })
  assert.throws(() => queryRegistry('check', { DSH_PET_REGISTRY: 'https://user:password@example.com' }), /Invalid registry/)
})
