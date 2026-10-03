/** Exercise actual DSH profile loading and composition in an isolated directory. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { planMigration, applyMigration, migrateProfile, OLD_NAMES, NEW_NAME } from './migrate-profile.mjs'

const host = path.resolve(process.argv[2] || 'node_modules/@deepseek-ai/dsh-app-boot')
const require = createRequire(path.join(host, 'package.json'))
const yaml = require('yaml')
const boot = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-app-boot')).href)
const atomic = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-atomic-write')).href)
const output = path.resolve('output/profile-migration-verification')
fs.mkdirSync(output, { recursive: true })
const scratch = fs.mkdtempSync(path.join(output, 'isolated-'))
const checks = []
const check = (name, value) => { assert.ok(value, name); checks.push(name) }
const profile = path.join(scratch, 'profiles/desktop')
const pkg = path.join(profile, 'node_modules', NEW_NAME)
fs.mkdirSync(pkg, { recursive: true })
fs.writeFileSync(path.join(profile, 'package.json'), JSON.stringify({ private: true, dsh: { profile: { bundles: [NEW_NAME] } } }))
fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: NEW_NAME, version: '1.3.3', dsh: { bundle: { patch: './cordis.patch.yml' } } }))
fs.copyFileSync(path.resolve('cordis.patch.yml'), path.join(pkg, 'cordis.patch.yml'))
const filename = path.join(profile, 'cordis.patch.yml')
const shared = path.join(scratch, 'cordis.patch.yml')
fs.writeFileSync(shared, '# shared home still serves an unmigrated web profile\n- id: pet\n  name: "' + OLD_NAMES[0] + '"\n  disabled: true\n')
const sharedBefore = fs.readFileSync(shared)
const compose = () => {
  const loaded = boot.loadProfileDirectory('dsh', profile, path.join(host, 'package.json'))
  assert.deepEqual(loaded.skippedBundles, [])
  const warnings = []
  const rows = boot.composeEntries([...loaded.layers.map(layer => layer.patches), loaded.patches], message => warnings.push(message))
  return { pet: rows.find(row => row.id === 'pet'), warnings }
}
const source = '# Saved pet preferences\r\n- id: pet\r\n  name: "' + OLD_NAMES[0] + '" # preserve this comment\r\n  disabled: true\r\n  config:\r\n    size: 173\r\n    bottom: 47\r\n    desktopEnabled: false\r\n    visible: false\r\n    petId: miku\r\n    animationFps: 144\r\n    animationRunFpsLimit: 240\r\n    animationActionFps: 7\r\n    animationMode: tick\r\n    animationTickSlope: 0.3\r\n    animationTickIntercept: 4\r\n- id: unrelated\r\n  name: another-plugin\r\n  config: { expression: !!js "env.EXAMPLE", keep: yes }\r\n'
fs.writeFileSync(filename, source)
check('actual DSH reproduces old-name override being skipped', compose().warnings.some(message => message.includes('name mismatch')))
check('old disabled flag is skipped before migration', compose().pet.disabled !== true)
const plan = planMigration(source, yaml)
check('only the exact name scalar changes; comments and CRLF survive', plan.updated === source.replace(JSON.stringify(OLD_NAMES[0]), JSON.stringify(NEW_NAME)))
const preview = await migrateProfile(filename, host, false)
check('preview composes the new pet row without writing the profile', preview.preview && fs.readFileSync(filename, 'utf8') === source)
const migrated = await migrateProfile(filename, host, true)
check('original patch has an exact backup', fs.readFileSync(migrated.backup, 'utf8') === source)
const after = compose()
check('actual composition no longer skips the pet override', !after.warnings.some(message => message.includes('"pet"') && message.includes('name mismatch')))
assert.deepEqual(after.pet.config, { size: 173, bottom: 47, desktopEnabled: false, visible: false, petId: 'miku', animationFps: 144, animationRunFpsLimit: 240, animationActionFps: 7, animationMode: 'tick', animationTickSlope: 0.3, animationTickIntercept: 4 })
checks.push('size, placement, selected pet and all FPS settings survive actual composition')
check('disabled state survives actual composition', after.pet.disabled === true)
check('the shared home patch is byte-for-byte unchanged', fs.readFileSync(shared).equals(sharedBefore))
check('migration is idempotent', (await migrateProfile(filename, host, true)).changes === 0)
fs.writeFileSync(filename, source + '# user edited this file concurrently\r\n')
await assert.rejects(applyMigration(filename, plan, atomic), /changed after inspection/)
check('a concurrent user edit is not overwritten', fs.readFileSync(filename, 'utf8').endsWith('# user edited this file concurrently\r\n'))
assert.throws(() => planMigration('- id: pet\n  name: "' + OLD_NAMES[0] + '"\n  name: duplicate\n', yaml), /Invalid patch/)
assert.throws(() => planMigration('- id: pet\n  name: &name "' + OLD_NAMES[0] + '"\n', yaml), /anchored/)
assert.throws(() => planMigration('- insert:\n    - id: pet\n      name: "' + OLD_NAMES[0] + '"\n', yaml), /insert/)
checks.push('ambiguous YAML, shared name anchors and legacy insert rows are rejected')
const duplicates = '- id: pet\n  name: "' + OLD_NAMES[0] + '"\n  config: { size: 173, petId: miku }\n- id: pet\n  name: ' + NEW_NAME + '\n  config: { size: 130, petId: blue-whale-business, animationActionFps: 9 }\n'
fs.writeFileSync(filename, duplicates)
const currentBefore = compose().pet
await migrateProfile(filename, host, true)
assert.deepEqual(compose().pet, currentBefore)
checks.push('later settings already saved under the new name keep precedence')
assert.throws(() => planMigration(duplicates.replace('  config: { size: 173', '  disabled: true\n  config: { size: 173'), yaml), /Conflicting/)
assert.throws(() => planMigration('- id: pet\n  name: ' + NEW_NAME + '\n  config: { size: 130 }\n- id: pet\n  name: "' + OLD_NAMES[0] + '"\n  config: { size: 173 }\n', yaml), /Conflicting/)
checks.push('conflicting disabled state and later stale overrides require review')
await assert.rejects(migrateProfile(shared, host, true), /profile package.json/)
checks.push('a shared home patch cannot be changed by this profile tool')
if (process.argv[3]) {
  fs.writeFileSync(filename, source)
  const shell = process.env.DSH_PET_TEST_POWERSHELL || path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe')
  const launcher = execFileSync(shell, ['-NoProfile', '-File', path.resolve('scripts/migrate-profile.ps1'), '-Apply', '-DshInstall', process.argv[3], '-ProfileDirectory', profile], { encoding: 'utf8', windowsHide: true, env: { ...process.env, DSH_HOME: scratch } })
  check('launcher uses the desktop bundled Node and returns successful migration', JSON.parse(launcher).changed === true)
  check('launcher restores the disabled preference', compose().pet.disabled === true)
}
const result = { status: 'passed', host, checks, scratch }
fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
