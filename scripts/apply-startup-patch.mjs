// Narrow local deployment: replace only three pet-owned files. No package
// manager, shared module fallback, session store or desktop archive changes.
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
const root = path.resolve(import.meta.dirname, '..'), require = createRequire(import.meta.url)
const home = path.join(process.env.USERPROFILE, '.dsh')
const backup = process.argv[2]
if (!backup || !fs.statSync(backup).isDirectory()) throw Error('Supply the existing full-backup directory.')
const originals = path.join(backup, 'pet-patch-originals')
if (fs.existsSync(originals)) throw Error('Patch originals already exist; refuse to overwrite rollback material.')
const files = ['companion-runtime.cjs', 'companion-host.cjs', 'bridge-manifest.json']
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const protectedFiles = ['cordis.patch.yml', ...['desktop', 'web'].flatMap(profile =>
  ['package.json', 'pnpm-lock.yaml', 'cordis.patch.yml'].map(file => `profiles/${profile}/${file}`))]
const protectedBefore = Object.fromEntries(protectedFiles.map(file => [file, hash(path.join(home, file))]))
const plans = ['desktop', 'web'].flatMap(profile => {
  const dir = fs.realpathSync(path.join(home, 'profiles', profile, 'node_modules/dsh-pets-multiworkers/desktop'))
  if (dir !== path.join(home, 'profiles', profile, 'node_modules/dsh-pets-multiworkers/desktop')) throw Error('Unexpected redirected plugin directory.')
  require(path.join(dir, 'archive-support.cjs')).loadPayload(path.dirname(dir))
  return files.map(file => {
    const target = path.join(dir, file), baseline = path.join(root, 'output/startup-performance/before/desktop', file)
    if (hash(target) !== hash(baseline)) throw Error('Installed pet changed since diagnosis: ' + target)
    return { profile, file, target, source: path.join(root, 'desktop', file), backup: path.join(originals, profile, file), before: hash(target) }
  })
})
// Complete and check rollback material for BOTH profiles before any mutation.
for (const plan of plans) {
  fs.mkdirSync(path.dirname(plan.backup), { recursive: true })
  fs.copyFileSync(plan.target, plan.backup, fs.constants.COPYFILE_EXCL)
  if (hash(plan.backup) !== plan.before) throw Error('Backup verification failed.')
}
const changed = []
function replace(source, target) {
  const temporary = target + '-startup-' + randomUUID() + '.tmp'
  try { fs.copyFileSync(source, temporary, fs.constants.COPYFILE_EXCL); fs.renameSync(temporary, target) }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary) }
}
try {
  for (const plan of plans) { replace(plan.source, plan.target); changed.push(plan); if (hash(plan.source) !== hash(plan.target)) throw Error('Installed file verification failed.') }
  for (const profile of ['desktop', 'web']) {
    const plugin = path.join(home, 'profiles', profile, 'node_modules/dsh-pets-multiworkers')
    require(path.join(plugin, 'desktop/archive-support.cjs')).loadPayload(plugin)
  }
  for (const [file, digest] of Object.entries(protectedBefore)) if (hash(path.join(home, file)) !== digest) throw Error('An unrelated profile file changed; review before proceeding: ' + file)
} catch (error) {
  for (const plan of changed.reverse()) replace(plan.backup, plan.target)
  throw error
}
const result = { installedAt: new Date().toISOString(), installed: true, activation: 'next normal DSH restart',
  backup: originals, sharedDependenciesModified: false, profilesAndSettingsPreserved: true,
  files: plans.map(({ profile, file, target, before }) => ({ profile, file, before, after: hash(target) })), protectedBefore }
fs.writeFileSync(path.join(root, 'output/startup-performance/deployment.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ installed: true, profiles: ['desktop', 'web'], filesPerProfile: files.length, backup: originals, sharedDependenciesModified: false }))
