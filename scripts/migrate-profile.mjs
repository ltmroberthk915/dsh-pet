// Explicit profile migration. Never run from an install hook or plugin startup.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

export const OLD_NAMES = ['@ltmroberthk915/dsh-pet', '@linxin666/dsh-pet']
export const NEW_NAME = 'dsh-pet-copilot'

export function planMigration(source, yaml) {
  const doc = yaml.parseDocument(source, { keepSourceTokens: true, uniqueKeys: true })
  if (doc.errors.length) throw Error('Invalid patch YAML: ' + doc.errors[0].message)
  if (!yaml.isSeq(doc.contents)) throw Error('The patch must be a YAML list')
  const rows = doc.contents.items.filter(item => yaml.isMap(item) && item.get('id') === 'pet')
  const current = rows.filter(item => !item.has('name') || item.get('name') === NEW_NAME)
  const replacements = []
  for (const item of doc.contents.items) {
    if (!yaml.isMap(item)) continue
    const inserted = item.get('insert', true)
    if (yaml.isSeq(inserted) && inserted.items.some(row => yaml.isMap(row) && row.get('id') === 'pet' && OLD_NAMES.includes(row.get('name')))) {
      throw Error('A legacy pet insert requires review; remove the old bundle through the plugin manager first')
    }
    if (item.get('id') !== 'pet') continue
    const name = item.get('name', true)
    if (yaml.isAlias(name)) throw Error('An aliased pet name requires review')
    if (!yaml.isScalar(name) || !OLD_NAMES.includes(name.value)) continue
    if (item.has('insert') || name.anchor || !name.range) throw Error('An inserted or anchored pet name requires review')
    // When the user has already saved settings under the new name, an ignored
    // legacy row must not overwrite that newer config or change disabled state.
    if (current.length) {
      const later = current.filter(row => doc.contents.items.indexOf(row) > doc.contents.items.indexOf(item))
      for (const pair of item.items) {
        const key = pair.key?.value
        if (key !== 'id' && key !== 'name' && !later.some(row => row.has(key))) {
          throw Error('Conflicting old and current pet overrides: ' + key + ' needs review; no file was changed')
        }
      }
    }
    replacements.push({ start: name.range[0], end: name.range[1] })
  }
  let updated = source
  for (const { start, end } of replacements.sort((a, b) => b.start - a.start)) {
    updated = updated.slice(0, start) + JSON.stringify(NEW_NAME) + updated.slice(end)
  }
  return { source, updated, changes: replacements.length, preservesCurrent: current.length > 0 }
}

export async function applyMigration(filename, plan, atomic, validate = () => {}) {
  if (!plan.changes) return { changed: false, changes: 0 }
  return atomic.withFileLock(filename, async () => {
    const stat = fs.lstatSync(filename)
    if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Refusing to replace a non-regular patch file')
    if (fs.readFileSync(filename, 'utf8') !== plan.source) throw Error('The patch changed after inspection; inspect it again')
    await validate()
    const backup = filename + '.before-pet-rename-' + randomUUID() + '.bak'
    fs.writeFileSync(backup, plan.source, { flag: 'wx', mode: stat.mode & 0o777 })
    await atomic.writeFileAtomic(filename, plan.updated, { mode: stat.mode & 0o777 })
    return { changed: true, changes: plan.changes, backup }
  })
}

export function verifyComposition(profileDir, host, plan, boot) {
  const loaded = boot.loadProfileDirectory('dsh', profileDir, path.join(host, 'package.json'))
  if (loaded.skippedBundles.some(bundle => bundle.packageName === NEW_NAME)) throw Error('DSH cannot load the new pet bundle')
  const layerPatches = loaded.layers.map(layer => layer.patches)
  const before = boot.composeEntries([...layerPatches, loaded.patches]).find(row => row.id === 'pet')
  const previewFile = path.join(os.tmpdir(), 'dsh-pet-patch-preview-' + randomUUID() + '.yml')
  try {
    fs.writeFileSync(previewFile, plan.updated, { flag: 'wx', mode: 0o600 })
    const warnings = []
    const rows = boot.composeEntries([...layerPatches, boot.loadOverlayPatches('dsh', previewFile)], warning => warnings.push(warning))
    const after = rows.find(row => row.id === 'pet')
    if (after?.name !== NEW_NAME || warnings.some(warning => warning.includes('"pet"') && warning.includes('name mismatch'))) {
      throw Error('DSH composition still rejects the pet override')
    }
    if (plan.preservesCurrent && !isDeepStrictEqual(before, after)) throw Error('Migration would change the existing current pet override; inspect the conflict first')
    return { petRow: true, currentSettingsPreserved: plan.preservesCurrent, disabled: after.disabled === true }
  } finally {
    if (fs.existsSync(previewFile)) fs.unlinkSync(previewFile)
  }
}

export async function migrateProfile(filename, host, apply) {
  if (!path.isAbsolute(filename) || path.basename(filename) !== 'cordis.patch.yml') throw Error('Pass an absolute profile cordis.patch.yml path')
  const profileDir = path.dirname(filename)
  const profileFile = path.join(profileDir, 'package.json')
  if (!fs.existsSync(profileFile)) throw Error('A profile package.json is required; the shared home patch must not be rewritten')
  const profileSource = fs.readFileSync(profileFile, 'utf8')
  const profile = JSON.parse(profileSource)
  const bundles = profile.dsh?.profile?.bundles ?? []
  if (!bundles.includes(NEW_NAME) || OLD_NAMES.some(name => bundles.includes(name))) throw Error('Install the new bundle and remove the old bundle in this profile first')
  const installed = JSON.parse(fs.readFileSync(path.join(profileDir, 'node_modules', NEW_NAME, 'package.json'), 'utf8'))
  if (installed.name !== NEW_NAME) throw Error('Installed package identity does not match')
  const require = createRequire(path.join(host, 'package.json'))
  const yaml = require('yaml')
  const boot = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-app-boot')).href)
  const atomic = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-atomic-write')).href)
  const plan = planMigration(fs.readFileSync(filename, 'utf8'), yaml)
  const composition = verifyComposition(profileDir, host, plan, boot)
  const validate = () => {
    if (fs.readFileSync(profileFile, 'utf8') !== profileSource) throw Error('Profile packages changed after inspection; inspect again')
    verifyComposition(profileDir, host, plan, boot)
  }
  const result = apply ? await applyMigration(filename, plan, atomic, validate) : { preview: true, changed: false, changes: plan.changes }
  return { patch: filename, oldNames: OLD_NAMES, newName: NEW_NAME, ...composition, ...result }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    const value = key => { const index = args.indexOf(key); return index < 0 ? undefined : args[index + 1] }
    const filename = value('--patch')
    if (!filename) throw Error('Usage: migrate-profile.mjs --patch <absolute profile cordis.patch.yml> [--host-root <DSH runtime>] [--apply]')
    const host = value('--host-root') || path.join(path.dirname(process.execPath), 'resources/app.asar/dsh')
    console.log(JSON.stringify(await migrateProfile(filename, host, args.includes('--apply')), null, 2))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
