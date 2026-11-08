// Reproduce in an owned sandbox; never heal the live shared dependency tree.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const globalDsh = path.join(process.env.APPDATA, 'npm/node_modules/@deepseek-ai/dsh')
const liveModules = path.join(process.env.USERPROFILE, '.dsh/profiles/node_modules')
const output = path.resolve(import.meta.dirname, '../output/startup-performance')
const sandbox = fs.mkdtempSync(path.join(output, 'cli-sandbox-'))
const { healProfilesModuleFallback } = await import(pathToFileURL(path.join(globalDsh, 'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')))
const packages = []
for (const entry of fs.readdirSync(liveModules, { withFileTypes: true })) {
  if (entry.name.startsWith('.')) continue
  if (entry.name.startsWith('@') && entry.isDirectory()) {
    for (const child of fs.readdirSync(path.join(liveModules, entry.name), { withFileTypes: true })) packages.push(entry.name + '/' + child.name)
  } else packages.push(entry.name)
}
const realPackages = packages.filter(name => {
  try {
    const dir = path.join(liveModules, name), stat = fs.lstatSync(dir)
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')))
    return stat.isDirectory() && !stat.isSymbolicLink() && !manifest.dsh?.moduleFallback?.targets
  } catch { return false }
})
// A tiny copy of each conflicting manifest is enough to reproduce ownership
// rejection; no sessions, secrets, installed plugins or live links are copied.
for (const name of realPackages) {
  const dir = path.join(sandbox, 'profiles/node_modules', name)
  fs.mkdirSync(dir, { recursive: true })
  fs.copyFileSync(path.join(liveModules, name, 'package.json'), path.join(dir, 'package.json'))
}
let error
try { await healProfilesModuleFallback({ installAnchor: path.join(globalDsh, 'package.json'), home: sandbox }) }
catch (caught) { error = caught.message }
const result = { realPackageDirectories: realPackages.length, reproduced: /not a symlink or dsh-managed module proxy/.test(error ?? ''), error, liveDirectoryModified: false }
fs.writeFileSync(path.join(output, 'cli-diagnosis.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result))
if (!result.reproduced) process.exitCode = 1
