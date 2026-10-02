/** Build and re-open a precompiled local package; never publish or install it. */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const root = resolve(import.meta.dirname,'..')
const require = createRequire(import.meta.url)
// Packaging must fail if a build changed the renderer after manifest sealing.
require('../desktop/archive-support.cjs').loadPayload(root)
const output = resolve(root,'output')
mkdirSync(output,{recursive:true})
const stage = mkdtempSync(join(output,'companion-package-stage-'))
const unpack = mkdtempSync(join(output,'companion-package-unpack-'))
const manifest = JSON.parse(readFileSync(join(root,'package.json'),'utf8'))
delete manifest.scripts
delete manifest.devDependencies
delete manifest.packageManager
const includes = ['src','desktop','assets/whale-refined','assets/miku','assets/blue-whale-business','assets/decorations',
  'contracts','docs','icon.svg','cordis.patch.yml','LICENSE','NOTICE','THIRD_PARTY_NOTICES.md','README.md','README.zh.md']
manifest.files = ['lib',...includes]
const copy = (relative,filter) => {
  const source = join(root,relative)
  if (!existsSync(source)) throw new Error('Missing package content: '+relative)
  cpSync(source,join(stage,relative),{recursive:true,filter})
}
try {
  for (const relative of includes) copy(relative,path=>!path.endsWith('.test.ts')&&!path.endsWith('.test.tsx'))
  for (const file of ['index.js','client.js','invariant.js']) copy('lib/'+file)
  copy('lib/types',path=>statSync(path).isDirectory()||path.endsWith('.d.ts'))
  writeFileSync(join(stage,'package.json'),JSON.stringify(manifest,null,2)+'\n')
  const npm = process.env.DSH_PET_NPM_CLI ?? 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js'
  const packed = spawnSync(process.execPath,[npm,'pack','--ignore-scripts','--json','--pack-destination',output],
    {cwd:stage,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024})
  if (packed.status!==0) throw new Error(packed.stderr||packed.stdout)
  const metadata = JSON.parse(packed.stdout)[0]
  const archive = join(output,'dsh-session-pet-'+manifest.version+'.tgz')
  cpSync(join(output,metadata.filename),archive)
  const opened = spawnSync('tar',['-xf',archive,'-C',unpack],{encoding:'utf8',windowsHide:true})
  if (opened.status!==0) throw new Error(opened.stderr)
  const installed = join(unpack,'package')
  const { loadPetRegistry } = await import(pathToFileURL(join(installed,'lib/index.js')))
  const { runPetInvariants } = await import(pathToFileURL(join(installed,'lib/invariant.js')))
  runPetInvariants()
  const registry = loadPetRegistry({packageRoot:installed,singlePet:true,petsDir:'',dshPetsDir:''})
  if (registry.warnings.length) throw new Error(registry.warnings.join('\n'))
  const ids = registry.entries.map(entry=>entry.id).sort()
  if (ids.join(',')!=='blue-whale-business,miku,whale-girl-refined') throw new Error('Wrong packaged pets: '+ids)
  let servedFiles = 0
  for (const pet of registry.entries) for (const path of pet.servable) {
    if (!existsSync(join(pet.dir,path))) throw new Error('Missing packaged asset: '+pet.id+'/'+path)
    servedFiles++
  }
  for (const file of ['desktop/overlay.js','desktop/overlay.css','desktop/bridge-manifest.json','desktop/install-desktop.cjs','desktop/Install-Desktop.ps1','desktop/archive-support.cjs','desktop/companion-main.cjs','desktop/companion-host.cjs','desktop/companion-runtime.cjs','docs/install-desktop-windows.md','lib/client.js','lib/types/index.d.ts','lib/types/client/index.d.ts']) {
    if (!existsSync(join(installed,file))) throw new Error('Missing packaged entry: '+file)
  }
  require(join(installed,'desktop/archive-support.cjs')).loadPayload(installed)
  const actual = JSON.parse(readFileSync(join(installed,'package.json'),'utf8'))
  if (actual.scripts||actual.devDependencies||actual.packageManager) throw new Error('Install-time hooks leaked into package')
  if (!readFileSync(join(installed,'lib/client.js'),'utf8').includes('@ltmroberthk915/dsh-pet')) throw new Error('Wrong browser module identity')
  const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex')
  const result = {status:'passed',name:manifest.name,version:manifest.version,archive:basename(archive),
    bytes:statSync(archive).size,sha256,packageFiles:metadata.files.length,petIds:ids,defaultPet:registry.defaultEntry().id,
    servedFiles,installScripts:false,files:metadata.files.map(file=>file.path)}
  writeFileSync(join(output,'companion-verification/package-results.json'),JSON.stringify(result,null,2)+'\n')
  writeFileSync(archive+'.sha256',sha256+'  '+basename(archive)+'\n')
  console.log(JSON.stringify({...result,files:undefined},null,2))
} finally {
  // Check the real, absolute paths before removing only this run's own staging.
  for (const directory of [stage,unpack]) {
    const absolute = realpathSync(directory)
    if (!absolute.startsWith(realpathSync(output)+sep)||!basename(absolute).startsWith('companion-package-')) throw new Error('Unsafe staging cleanup: '+absolute)
    rmSync(absolute,{recursive:true,force:true})
  }
}
