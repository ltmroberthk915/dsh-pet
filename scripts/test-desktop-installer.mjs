import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {install,parseArgs}=require('../desktop/install-desktop.cjs')
const {loadPayload,inspectArchive,sha256,verifyChange}=require('../desktop/archive-support.cjs')
const root=path.resolve(import.meta.dirname,'..')
const [pristinePath,previousPath]=process.argv.slice(2)
if(!pristinePath||!previousPath) throw Error('Supply reviewed pristine and previous ASAR fixtures.')
const pristine=fs.readFileSync(pristinePath),previous=fs.readFileSync(previousPath),payload=loadPayload(root)
assert.equal(inspectArchive(pristine,payload.manifest).status,'not-installed')
assert.equal(inspectArchive(previous,payload.manifest).status,'upgrade')
const parent=path.join(root,'output/desktop-installer-tests')
fs.mkdirSync(parent,{recursive:true})
const fixture=fs.mkdtempSync(path.join(parent,'run-'))
const appDir=path.join(fixture,'中文 空格 应用'),resources=path.join(appDir,'resources'),archive=path.join(resources,'app.asar')
const dshHome=path.join(fixture,'自定义 数据'),sentinel=path.join(dshHome,'sessions.txt')
fs.mkdirSync(resources,{recursive:true});fs.mkdirSync(dshHome,{recursive:true})
fs.writeFileSync(path.join(appDir,'DeepSeek Harness.exe'),'fixture only')
fs.writeFileSync(sentinel,'fixture conversations must remain intact')
const userDataHash=sha256(fs.readFileSync(sentinel))
const options={appDir,pluginDir:root,dshHome},noProcesses={getRunningProcesses:()=>[]}
const checks=[]
const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name)}
const reset=(bytes=pristine)=>fs.writeFileSync(archive,bytes)
const assertOriginal=(bytes=pristine)=>assert.equal(sha256(fs.readFileSync(archive)),sha256(bytes))
let first,patched
try {
  check('argument parsing preserves custom paths and rejects conflicting modes',()=>{
    assert.deepEqual(parseArgs(['--apply','--app-dir',appDir,'--dsh-home',dshHome]),{mode:'apply',appDir,dshHome})
    assert.throws(()=>parseArgs(['--apply','--rollback']))
  })
  check('check is read-only and identifies an unpatched host',()=>{
    reset();const result=install({...options,mode:'check'},noProcesses)
    assert.equal(result.status,'not-installed');assertOriginal()
    assert.equal(fs.existsSync(path.join(resources,'dsh-pet-backups')),false)
  })
  check('unknown archive is rejected without writes',()=>{
    const unknown=Buffer.from(pristine);unknown[unknown.length-1]^=1;reset(unknown)
    assert.throws(()=>install({...options,mode:'apply'},noProcesses),/Unsupported or modified/);assertOriginal(unknown)
  })
  check('running DSH prevents installation without stopping its process',()=>{
    reset();assert.throws(()=>install({...options,mode:'apply'},{getRunningProcesses:()=>[{ProcessId:123,ExecutablePath:path.join(appDir,'DeepSeek Harness.exe')}]}),/still running/);assertOriginal()
  })
  check('unreadable process state fails closed',()=>{
    assert.throws(()=>install({...options,mode:'apply'},{getRunningProcesses:()=>{throw Error('process probe failed')}}),/process probe failed/);assertOriginal()
  })
  check('backup failure leaves original archive intact',()=>{
    assert.throws(()=>install({...options,mode:'apply'},{...noProcesses,fs:{...fs,copyFileSync(){throw Error('fixture backup failure')}}}),/fixture backup failure/);assertOriginal()
  })
  check('staging write failure leaves original archive intact',()=>{
    assert.throws(()=>install({...options,mode:'apply'},{...noProcesses,fs:{...fs,writeFileSync(file,...args){if(path.basename(file).startsWith('.dsh-pet-install-'))throw Error('fixture disk full');return fs.writeFileSync(file,...args)}}}),/fixture disk full/);assertOriginal()
  })
  check('replacement failure preserves the verified backup and original',()=>{
    assert.throws(()=>install({...options,mode:'apply'},{...noProcesses,fs:{...fs,renameSync(){throw Error('fixture replacement blocked')}}}),/fixture replacement blocked/);assertOriginal()
  })
  check('DSH starting during preparation prevents replacement',()=>{
    let calls=0;assert.throws(()=>install({...options,mode:'apply'},{getRunningProcesses:()=>++calls===1?[]:[{ProcessId:123,ExecutablePath:path.join(appDir,'DeepSeek Harness.exe')}]}),/still running/);assertOriginal()
  })
  check('post-replacement receipt failure restores only the program archive',()=>{
    assert.throws(()=>install({...options,mode:'apply'},{...noProcesses,fs:{...fs,writeFileSync(file,body,...args){if(path.basename(file)==='receipt.json'&&JSON.parse(body).status==='installed')throw Error('fixture receipt failed');return fs.writeFileSync(file,body,...args)}}}),/fixture receipt failed/);assertOriginal()
  })
  check('first installation changes only reviewed ASAR files with verified integrity',()=>{
    first=install({...options,mode:'apply'},noProcesses);assert.equal(first.status,'installed')
    patched=fs.readFileSync(archive);const audit=verifyChange(pristine,patched,payload)
    assert.ok(audit.changed.length<=9);assert.ok(audit.unchangedPackedFiles>11000)
    assert.equal(sha256(fs.readFileSync(path.join(first.backup,'app.asar'))),sha256(pristine))
    assert.equal(inspectArchive(patched,payload.manifest).status,'current')
  })
  check('repeat installation is a no-op with no extra backup',()=>{
    const backups=fs.readdirSync(path.join(resources,'dsh-pet-backups')).length
    assert.equal(install({...options,mode:'apply'},noProcesses).status,'current')
    assert.equal(fs.readdirSync(path.join(resources,'dsh-pet-backups')).length,backups);assertOriginal(patched)
  })
  check('rollback restores the exact original without modifying user data',()=>{
    assert.equal(install({...options,mode:'rollback',receipt:first.receipt},noProcesses).status,'restored');assertOriginal()
    assert.equal(install({...options,mode:'rollback',receipt:first.receipt},noProcesses).status,'already-restored')
    assert.equal(sha256(fs.readFileSync(sentinel)),userDataHash)
  })
  check('previous patched v1.0.5 upgrades and rolls back exactly',()=>{
    reset(previous);const result=install({...options,mode:'apply'},noProcesses)
    assert.equal(result.status,'installed');assert.equal(inspectArchive(fs.readFileSync(archive),payload.manifest).status,'current')
    assert.equal(install({...options,mode:'rollback',receipt:result.receipt},noProcesses).status,'restored');assertOriginal(previous)
  })
  check('rollback refuses to overwrite a subsequent program update',()=>{
    const changed=Buffer.from(patched);changed[changed.length-1]^=1;reset(changed)
    assert.throws(()=>install({...options,mode:'rollback',receipt:first.receipt},noProcesses),/changed after this installation/);assertOriginal(changed)
  })
  check('PowerShell launcher works with host-bundled Node and an empty PATH',()=>{
    reset();const bundled=path.join(resources,'runtime/primary-runtime/dependencies/node/bin')
    fs.mkdirSync(bundled,{recursive:true});fs.copyFileSync(process.execPath,path.join(bundled,'node.exe'))
    const shell=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe')
    const result=spawnSync(shell,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'desktop/Install-Desktop.ps1'),'-Mode','Check','-AppDirectory',appDir,'-DshHome',dshHome,'-PluginDirectory',root],{encoding:'utf8',windowsHide:true,timeout:30000,env:{...process.env,PATH:path.dirname(shell)}})
    assert.equal(result.status,0,result.stderr||result.stdout);assert.equal(JSON.parse(result.stdout).status,'not-installed');assertOriginal()
  })
  check('fixture session data and unpacked entries remain unchanged',()=>assert.equal(sha256(fs.readFileSync(sentinel)),userDataHash))
  fs.writeFileSync(path.join(parent,'results.json'),JSON.stringify({status:'passed',checks,source:'real reviewed ASAR copies; isolated filesystem/process failure simulations',newComputerTested:false},null,2)+'\n')
  console.log(JSON.stringify({status:'passed',checks:checks.length}))
} finally {
  const absolute=fs.realpathSync(fixture)
  if(!absolute.startsWith(fs.realpathSync(parent)+path.sep)||!path.basename(absolute).startsWith('run-'))throw Error('Unsafe fixture cleanup')
  fs.rmSync(absolute,{recursive:true,force:true})
}
