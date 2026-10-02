#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { loadPayload,inspectArchive,sha256 } = require('./archive-support.cjs');
const { patchArchive } = require('./patch-desktop.cjs');

function getRunningProcesses() {
  if(process.platform!=='win32') throw Error('The desktop installer supports Windows only.');
  const script="$ErrorActionPreference='Stop'; @(Get-CimInstance Win32_Process -Filter \"Name='DeepSeek Harness.exe'\" | Select-Object ProcessId,ExecutablePath) | ConvertTo-Json -Compress";
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',windowsHide:true,timeout:20000});
  if(result.status!==0) throw Error('Cannot verify that DSH has exited: '+(result.stderr||result.error?.message||''));
  const parsed=JSON.parse(result.stdout.trim()||'[]');
  return Array.isArray(parsed)?parsed:[parsed];
}
function appCandidates() {
  const roots=[process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Programs','DeepSeek Harness'),process.env.ProgramFiles&&path.join(process.env.ProgramFiles,'DeepSeek Harness')];
  let candidate=path.dirname(process.execPath);
  for(let i=0;i<9;i++) { roots.push(candidate); const parent=path.dirname(candidate);if(parent===candidate)break;candidate=parent; }
  return [...new Set(roots.filter(Boolean).filter(dir=>fs.existsSync(path.join(dir,'DeepSeek Harness.exe'))&&fs.existsSync(path.join(dir,'resources','app.asar'))).map(dir=>fs.realpathSync(dir)))];
}
function resolveApp(appDir) {
  if(!appDir) { const candidates=appCandidates();if(candidates.length!==1) throw Error('Specify --app-dir with the directory containing DeepSeek Harness.exe.');appDir=candidates[0]; }
  const dir=fs.realpathSync(appDir);
  if(!fs.existsSync(path.join(dir,'DeepSeek Harness.exe'))) throw Error('DeepSeek Harness.exe not found in --app-dir.');
  return dir;
}
function stopped(appDir,processes) {
  const executable=fs.realpathSync(path.join(appDir,'DeepSeek Harness.exe')).toLowerCase();
  const running=processes().filter(p=>!p.ExecutablePath||executablePath(p.ExecutablePath)===executable);
  if(running.length) throw Error('请先正常退出 DSH（包括系统托盘）再安装或回滚；未停止任何进程。 / DSH is still running.');
}
function executablePath(file) {
  try { return fs.realpathSync(file).toLowerCase(); }
  catch { return path.resolve(file).toLowerCase(); }
}
function writeReceipt(io,file,receipt) { io.writeFileSync(file,JSON.stringify(receipt,null,2)+'\n',{encoding:'utf8'}); }
function install(options={},dependencies={}) {
  const io=dependencies.fs??fs,processes=dependencies.getRunningProcesses??getRunningProcesses;
  if(!['check','apply','rollback'].includes(options.mode??'check')) throw Error('Use --check, --apply or --rollback.');
  const dshHome=path.resolve(options.dshHome??process.env.DSH_HOME??path.join(os.homedir(),'.dsh'));
  let pluginDir=options.pluginDir;
  if(!pluginDir) {
    const sibling=path.join(__dirname,'..','package.json');
    pluginDir=fs.existsSync(sibling)&&JSON.parse(fs.readFileSync(sibling)).name==='@ltmroberthk915/dsh-pet'
      ?path.join(__dirname,'..'):path.join(dshHome,'profiles','desktop','node_modules','@ltmroberthk915','dsh-pet');
  }
  const payload=loadPayload(pluginDir);
  let receipt,receiptPath;
  if(options.mode==='rollback') {
    if(!options.receipt) throw Error('--rollback requires --receipt from a completed installation.');
    receiptPath=fs.realpathSync(options.receipt);
    receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
    if(receipt.schemaVersion!==1||!receipt.appDir||!/^[a-f0-9]{64}$/.test(receipt.before)||!/^[a-f0-9]{64}$/.test(receipt.after)) throw Error('Invalid installation receipt.');
  }
  const appDir=resolveApp(options.appDir??receipt?.appDir),archivePath=path.join(appDir,'resources','app.asar');
  const original=fs.readFileSync(archivePath),before=sha256(original);
  if(options.mode==='rollback') {
    if(fs.realpathSync(receipt.appDir).toLowerCase()!==appDir.toLowerCase()) throw Error('Receipt belongs to a different DSH installation.');
    if(before===receipt.before) return {status:'already-restored',appDir,sha256:before};
    if(before!==receipt.after) throw Error('DSH changed after this installation; rollback refused to protect the newer program.');
    const backup=fs.readFileSync(path.join(path.dirname(receiptPath),'app.asar'));
    if(sha256(backup)!==receipt.before) throw Error('Backup checksum mismatch.');
    inspectArchive(backup,payload.manifest);
    stopped(appDir,processes);
    const stage=path.join(appDir,'resources','.dsh-pet-rollback-'+randomUUID()+'.asar');
    try {
      io.writeFileSync(stage,backup,{flag:'wx'});
      if(sha256(fs.readFileSync(stage))!==receipt.before) throw Error('Rollback staging verification failed.');
      stopped(appDir,processes);
      if(sha256(fs.readFileSync(archivePath))!==before) throw Error('Desktop archive changed during rollback.');
      io.renameSync(stage,archivePath);
      if(sha256(fs.readFileSync(archivePath))!==receipt.before) throw Error('Rollback verification failed; original backup retained at '+path.dirname(receiptPath));
      receipt.status='restored';receipt.restoredAt=new Date().toISOString();writeReceipt(io,receiptPath,receipt);
      return {status:'restored',appDir,sha256:receipt.before,receipt:receiptPath};
    } finally { if(fs.existsSync(stage)) fs.unlinkSync(stage); }
  }
  const info=inspectArchive(original,payload.manifest);
  const result={status:info.status,version:payload.manifest.version,hostVersion:info.version,appDir,pluginDir:payload.root,dshHome,sha256:before};
  if(options.mode!=='apply'||info.status==='current') {
    const running=processes().some(p=>!p.ExecutablePath||executablePath(p.ExecutablePath)===executablePath(path.join(appDir,'DeepSeek Harness.exe')));
    const preview=patchArchive(original,payload),after=sha256(preview.bytes);
    const compatible=payload.manifest.currentArchives.includes(after);
    return {...result,running,compatible,outputSha256:after,canApply:compatible&&!running&&info.status!=='current',userDataModified:false};
  }
  stopped(appDir,processes);
  // Everything is prepared and validated before the installed archive changes.
  const patched=patchArchive(original,payload),after=sha256(patched.bytes);
  if(!payload.manifest.currentArchives.includes(after)) throw Error('This supported source needs a release manifest update; no files changed.');
  const backupDir=path.join(appDir,'resources','dsh-pet-backups',new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8));
  io.mkdirSync(backupDir,{recursive:true});
  const backupArchive=path.join(backupDir,'app.asar');
  io.copyFileSync(archivePath,backupArchive,fs.constants.COPYFILE_EXCL);
  if(sha256(fs.readFileSync(backupArchive))!==before) throw Error('Backup verification failed; installation unchanged.');
  receiptPath=path.join(backupDir,'receipt.json');
  receipt={schemaVersion:1,status:'prepared',version:payload.manifest.version,appDir,before,after,createdAt:new Date().toISOString(),changed:patched.changed,userDataModified:false};
  writeReceipt(io,receiptPath,receipt);
  const stage=path.join(appDir,'resources','.dsh-pet-install-'+randomUUID()+'.asar');
  let replaced=false;
  try {
    io.writeFileSync(stage,patched.bytes,{flag:'wx'});
    if(sha256(fs.readFileSync(stage))!==after) throw Error('Staging verification failed.');
    stopped(appDir,processes);
    if(sha256(fs.readFileSync(archivePath))!==before) throw Error('Desktop archive changed during preparation.');
    // Same-volume rename replaces the closed file atomically. The verified
    // backup remains available even if this process is interrupted afterward.
    io.renameSync(stage,archivePath);replaced=true;
    if(sha256(fs.readFileSync(archivePath))!==after) throw Error('Installed archive verification failed.');
    receipt.status='installed';writeReceipt(io,receiptPath,receipt);
    return {...result,status:'installed',sha256:after,backup:backupDir,receipt:receiptPath,changed:patched.changed,userDataModified:false};
  } catch(error) {
    if(replaced) {
      // Restore only our own archive; never overwrite a subsequent host update.
      if(sha256(fs.readFileSync(archivePath))!==after) throw Error(error.message+' Backup retained: '+backupDir);
      fs.copyFileSync(backupArchive,stage,fs.constants.COPYFILE_EXCL);
      fs.renameSync(stage,archivePath);
      if(sha256(fs.readFileSync(archivePath))!==before) throw Error('Automatic restore failed; backup retained: '+backupDir);
    }
    receipt.status=replaced?'restored-after-error':'not-installed';receipt.error=error.message;
    try { writeReceipt(fs,receiptPath,receipt); } catch {}
    throw Error(error.message+' Original archive preserved. Backup: '+backupDir);
  } finally { if(fs.existsSync(stage)) fs.unlinkSync(stage); }
}
function parseArgs(args) {
  const out={mode:'check'};let modes=0;
  const fields={'--app-dir':'appDir','--dsh-home':'dshHome','--plugin-dir':'pluginDir','--receipt':'receipt'};
  for(let i=0;i<args.length;i++) {
    if(['--check','--apply','--rollback'].includes(args[i])) { out.mode=args[i].slice(2);modes++; }
    else if(fields[args[i]]&&args[i+1]&&!args[i+1].startsWith('--')) out[fields[args[i]]]=args[++i];
    else throw Error('Unknown or incomplete argument: '+args[i]);
  }
  if(modes>1) throw Error('Choose exactly one installer mode.');
  return out;
}
module.exports={install,parseArgs,getRunningProcesses};
if(require.main===module) {
  try { console.log(JSON.stringify(install(parseArgs(process.argv.slice(2))),null,2)); }
  catch(error) { console.error(JSON.stringify({status:'error',message:error.message}));process.exitCode=1; }
}
