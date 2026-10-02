import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
const require=createRequire(import.meta.url)
const {sha256,runtimeFiles,sourceArchives}=require('../desktop/archive-support.cjs')
const {patchArchive}=require('../desktop/patch-desktop.cjs')
const root=resolve(import.meta.dirname,'..'),dir=join(root,'desktop')
const pkg=JSON.parse(readFileSync(join(root,'package.json')))
const files=[...runtimeFiles,'patch-desktop.cjs','archive-support.cjs','install-desktop.cjs','Install-Desktop.ps1','companion-runtime.cjs','companion-host.cjs','companion-main.cjs']
const manifest={schemaVersion:1,packageName:pkg.name,version:pkg.version,hostVersion:'0.2.0-rc.2',files:Object.fromEntries(files.map(name=>[name,sha256(readFileSync(join(dir,name)))])),currentArchives:[]}
const inputs=process.argv.slice(2)
if(!inputs.length) throw Error('Supply reviewed original/previous ASAR files to seal the desktop manifest.')
for(const file of inputs) {
  const original=readFileSync(file)
  if(!sourceArchives.includes(sha256(original))) throw Error('Unreviewed manifest input: '+file)
  const result=patchArchive(original,{dir,manifest})
  const digest=sha256(result.bytes)
  if(!manifest.currentArchives.includes(digest)) manifest.currentArchives.push(digest)
}
manifest.currentArchives.sort()
writeFileSync(join(dir,'bridge-manifest.json'),JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({version:manifest.version,verifiedSourceArchives:inputs.length,currentArchiveVariants:manifest.currentArchives.length,runtimeFiles:files.length}))
