// Legacy ASAR inspection lives here alongside shared payload checksums.
// DSH Pet 1.2+ starts its own native process and never applies an ASAR patch.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const runtimeFiles = ['pet-main.js','pet-layout.js','pet-preload.cjs','pet-window.html','overlay.js','overlay.css'];
const allowedPaths = new Set(['lib/main.js','lib/preload-app.cjs','dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js',...runtimeFiles.map(f=>'lib/dsh-pet/'+f)]);
// Exact reviewed archives only. The v1.0.5 archive was compared against the
// accepted layout archive: 11,473 packed files identical, three pet files changed.
const sourceArchives = [
  'addb3d95122f91c2c311d94cf92ff17d76f86fbd369946e3a74de3fb321d7323',
  'c5d83065cf924848b635f3489bdb23c66daa97919d02091da80ac5b9bc6c5bfd',
  '983ca71114e6dfd353fc79af5a1f9481a250ee64c2a3c757673029b811b23bc2',
  'c2ab0a463d6575d6c7b0e367258eeee285440e8902c9daa6502564281651a647',
  'd35821882c7d804b2fbdd340960df6c92ae1fa7c777bb0c605ede09f21b10c6f',
  '8648ad8545dd9e7360d7f7200638cbbe92e055724ee897cc797deff0cb996f0d',
  '717e7f72cf40e65dd29d66412d9e06854074b48e576578579944f58002f22523',
  '19e4b007274c8297792484c5e84b95222856837aceea7308a11bfff881ae1825',
  'ddddf21819f9e89a3529e59ad5b58caf2dfbb879567de862618f9969f6a0c571',
  '995878d33beae9db4d3e9c6e1069ad71ed52c7726b77ea246403f34fd77bc05c',
  // Sealed v1.1.1 outputs, retained for the optional legacy patch upgrade.
  '43bd7ccd3c9497c018ce4af5775f80aec6df8ff70baae705c4d43b80058d3093',
  '67197d0a5373ce97b2c5cc87d25b42054a91d489af5865db92b80715027a76a3',
];
function parseArchive(bytes) {
  if (bytes.length<16) throw Error('Invalid ASAR header');
  const length=bytes.readUInt32LE(12),offset=8+bytes.readUInt32LE(4);
  if (length>32*1024*1024 || 16+length>offset || offset>bytes.length) throw Error('Invalid ASAR bounds');
  const header=JSON.parse(bytes.subarray(16,16+length).toString('utf8'));
  const entries=new Map();
  function walk(files,prefix='') {
    if (!files || typeof files!=='object') throw Error('Invalid ASAR directory');
    for(const [name,entry] of Object.entries(files)) {
      if (!name || name==='.' || name==='..' || /[\\/]/.test(name)) throw Error('Invalid ASAR entry');
      const key=prefix+name;
      if(entry.files) { walk(entry.files,key+'/'); continue; }
      if (!entry.unpacked && !entry.link) {
        const start=Number(entry.offset),size=entry.size;
        if (!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(size)||size<0||offset+start+size>bytes.length) throw Error('Invalid ASAR file: '+key);
      }
      entries.set(key,entry);
    }
  }
  walk(header.files);
  const read=name=> {
    const entry=entries.get(name);
    if(!entry||entry.unpacked||entry.link) throw Error('Missing packed ASAR file: '+name);
    return bytes.subarray(offset+Number(entry.offset),offset+Number(entry.offset)+entry.size);
  };
  return {bytes,header,entries,read};
}
function inspectArchive(bytes,manifest) {
  const archive=parseArchive(bytes),digest=sha256(bytes);
  const pkg=JSON.parse(archive.read('package.json'));
  if(pkg.name!=='@deepseek-ai/dsh-desktop'||pkg.version!=='0.2.0-rc.2') throw Error('Unsupported DSH Desktop version: '+pkg.name+' '+pkg.version);
  const current=(manifest.currentArchives??[]).includes(digest);
  if (!sourceArchives.includes(digest)&&!current) throw Error('Unsupported or modified desktop archive. SHA256: '+digest);
  if(current) for(const file of runtimeFiles) {
    if(sha256(archive.read('lib/dsh-pet/'+file))!==manifest.files[file]) throw Error('Installed renderer mismatch: '+file);
  }
  return {archive,sha256:digest,version:pkg.version,status:current?'current':archive.entries.has('lib/dsh-pet/pet-main.js')?'upgrade':'not-installed'};
}
function loadPayload(pluginDir) {
  const root=fs.realpathSync(pluginDir),dir=path.join(root,'desktop');
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'bridge-manifest.json'),'utf8'));
  if(pkg.name!=='dsh-pet-copilot'||manifest.packageName!==pkg.name||manifest.version!==pkg.version) throw Error('Install the matching dsh-pet-copilot package first.');
  for(const [name,digest] of Object.entries(manifest.files)) {
    if(!/^[a-zA-Z0-9.-]+$/.test(name)) throw Error('Invalid desktop manifest path');
    if(sha256(fs.readFileSync(path.join(dir,name)))!==digest) throw Error('Desktop file checksum mismatch: '+name);
  }
  for(const name of [...runtimeFiles,'patch-desktop.cjs','archive-support.cjs','install-desktop.cjs','Install-Desktop.ps1','companion-runtime.cjs','companion-host.cjs','companion-main.cjs']) if(!manifest.files[name]) throw Error('Incomplete desktop manifest: '+name);
  return {root,dir,manifest};
}
function verifyChange(before,after,payload) {
  const a=parseArchive(before),b=parseArchive(after),changed=[];
  for(const [name,entry] of a.entries) {
    const next=b.entries.get(name);
    if(!next) throw Error('ASAR file removed: '+name);
    if(entry.unpacked||entry.link) {
      if(JSON.stringify(entry)!==JSON.stringify(next)) throw Error('ASAR external entry changed: '+name);
    } else if(!a.read(name).equals(b.read(name))) {
      if(!allowedPaths.has(name)) throw Error('Unexpected ASAR change: '+name);
      changed.push(name);
    } else {
      const clean=e=>{const copy={...e};delete copy.offset;return JSON.stringify(copy)};
      if(!allowedPaths.has(name)&&clean(entry)!==clean(next)) throw Error('ASAR metadata changed: '+name);
    }
  }
  for(const name of b.entries.keys()) if(!a.entries.has(name)) {
    if(!allowedPaths.has(name)) throw Error('Unexpected ASAR addition: '+name);
    changed.push(name);
  }
  for(const name of allowedPaths) {
    const bytes=b.read(name),integrity=b.entries.get(name).integrity;
    if(integrity?.algorithm!=='SHA256'||integrity.hash!==sha256(bytes)||!Number.isSafeInteger(integrity.blockSize)||integrity.blockSize<=0) throw Error('Invalid ASAR integrity: '+name);
    const blocks=[];
    for(let i=0;i<bytes.length;i+=integrity.blockSize) blocks.push(sha256(bytes.subarray(i,i+integrity.blockSize)));
    if(JSON.stringify(blocks)!==JSON.stringify(integrity.blocks)) throw Error('Invalid ASAR block integrity: '+name);
  }
  for(const file of runtimeFiles) if(!b.read('lib/dsh-pet/'+file).equals(fs.readFileSync(path.join(payload.dir,file)))) throw Error('Bundled desktop mismatch: '+file);
  if(!b.read('lib/preload-app.cjs').includes("process.isMainFrame && location.protocol === 'dsh-app:' && location.hostname === 'app'")) throw Error('Missing narrow desktop bridge');
  return {changed,unchangedPackedFiles:[...a.entries.keys()].filter(n=>!allowedPaths.has(n)&&!a.entries.get(n).unpacked&&!a.entries.get(n).link).length};
}
module.exports={sha256,sourceArchives,runtimeFiles,allowedPaths,parseArchive,inspectArchive,loadPayload,verifyChange};
