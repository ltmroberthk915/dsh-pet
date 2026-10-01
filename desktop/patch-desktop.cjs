const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error('source and output archive required');
const original = fs.readFileSync(source);
if (path.resolve(source).toLowerCase() === path.resolve(output).toLowerCase()) throw new Error('Use a separate output archive');
const acceptedArchives = ['983ca71114e6dfd353fc79af5a1f9481a250ee64c2a3c757673029b811b23bc2', 'c2ab0a463d6575d6c7b0e367258eeee285440e8902c9daa6502564281651a647', 'd35821882c7d804b2fbdd340960df6c92ae1fa7c777bb0c605ede09f21b10c6f', '8648ad8545dd9e7360d7f7200638cbbe92e055724ee897cc797deff0cb996f0d', '717e7f72cf40e65dd29d66412d9e06854074b48e576578579944f58002f22523'];
if (!acceptedArchives.includes(crypto.createHash('sha256').update(original).digest('hex'))) throw new Error('Unsupported or modified desktop archive');
const header = JSON.parse(original.subarray(16, 16+original.readUInt32LE(12)).toString());
const originalOffset = 8 + original.readUInt32LE(4);
const replacements = new Map();
function readEntry(name) { let entry=header;for(const part of name.split('/'))entry=entry.files[part];return original.subarray(originalOffset+Number(entry.offset),originalOffset+Number(entry.offset)+entry.size).toString(); }
function replace(source, needle, value) { if(!source.includes(needle))throw new Error('Unsupported desktop version: '+needle);return source.replace(needle,value); }
let main=readEntry('lib/main.js');
if (!main.includes('installDesktopPet')) {
main = "import { installDesktopPet } from './dsh-pet/pet-main.js';\n" + main;
main = replace(main, '\tinstallDesktopDirectoryPicker(() => mainWindow);', `	installDesktopPet({
		owner: () => mainWindow,
		openMain: () => focusPrimaryWindow(),
		request: (path, method = 'GET', body) => {
			if (backend.host === void 0 || hostUrl === void 0 || hostCookie === void 0) return Promise.resolve(new Response(null, { status: 503 }));
			return forwardWebRequest(new Request('dsh-app://app' + path, {
				method, signal: AbortSignal.timeout(10000),
				...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
			}), hostUrl, hostCookie);
		}
	});
	installDesktopDirectoryPicker(() => mainWindow);`);
}
replacements.set('lib/main.js', Buffer.from(main));
let preload=readEntry('lib/preload-app.cjs');
const bridgeMarker='\n// Local DSH Pet bridge: top-level application renderer only.\n';
if (preload.includes(bridgeMarker)) preload=preload.slice(0,preload.indexOf(bridgeMarker));
preload += `\n// Local DSH Pet bridge: top-level application renderer only.\nif (process.isMainFrame && location.protocol === 'dsh-app:' && location.hostname === 'app') {
 electron.contextBridge.exposeInMainWorld('dshPetDesktop', {
   configure: options => electron.ipcRenderer.invoke('dsh-pet-v1:configure', options),
   state: id => electron.ipcRenderer.invoke('dsh-pet-v1:owner-state', id),
   resetPosition: () => electron.ipcRenderer.invoke('dsh-pet-v1:owner-reset')
 });
 electron.ipcRenderer.on('dsh-pet-v1:open-session', (_event, id) => {
   if (typeof id === 'string') window.dispatchEvent(new CustomEvent('dsh-pet-open-session', { detail: id }));
 });
}\n`;
replacements.set('lib/preload-app.cjs', Buffer.from(preload));
// A second app-boot module instance has its own WeakMap. Locate only the
// existing root Include when the settings provider crosses that module seam.
const bootPath = 'dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js';
let boot = readEntry(bootPath);
if (!boot.includes("const rootInclude = ctx.loader?.resolve('include');")) boot = replace(boot, 'const entry = bootstrapIncludes.get(ctx);', `const rootInclude = ctx.loader?.resolve('include');
\tconst entry = bootstrapIncludes.get(ctx) ?? (rootInclude?.parent === ctx.loader?.root && rootInclude?.options.name === 'cordis:include' ? rootInclude : void 0);`);
replacements.set(bootPath, Buffer.from(boot));
for (const file of ['pet-main.js','pet-preload.cjs','pet-window.html','overlay.js','overlay.css']) replacements.set('lib/dsh-pet/'+file,fs.readFileSync(path.join(__dirname,file)));
for (const name of replacements.keys()) { let parent=header;const parts=name.split('/');for (const part of parts.slice(0,-1)) { parent.files[part]??={files:{}};parent=parent.files[part]; } parent.files[parts.at(-1)]??={}; }
const blocks=[]; let offset=0;
function walk(files,prefix='') {
  for(const [name,entry] of Object.entries(files)) {
    const key=prefix+name;
    if(entry.files){walk(entry.files,key+'/');continue;}
    if(entry.unpacked || entry.link)continue;
    const bytes=replacements.get(key)??original.subarray(originalOffset+Number(entry.offset),originalOffset+Number(entry.offset)+entry.size);
    entry.offset=String(offset);entry.size=bytes.length;offset+=bytes.length;
    if(replacements.has(key)) {
      const hash=b=>crypto.createHash('sha256').update(b).digest('hex'); const blockSize=4194304;const chunks=[];
      for(let n=0;n<bytes.length;n+=blockSize)chunks.push(hash(bytes.subarray(n,n+blockSize)));
      entry.integrity={algorithm:'SHA256',hash:hash(bytes),blockSize,blocks:chunks};
    }
    blocks.push(bytes);
  }
}
walk(header.files);
const json=Buffer.from(JSON.stringify(header));const payloadSize=4+json.length;const aligned=Math.ceil(payloadSize/4)*4;
const jsonPickle=Buffer.alloc(4+aligned);jsonPickle.writeUInt32LE(aligned,0);jsonPickle.writeUInt32LE(json.length,4);json.copy(jsonPickle,8);
const sizePickle=Buffer.alloc(8);sizePickle.writeUInt32LE(4,0);sizePickle.writeUInt32LE(jsonPickle.length,4);
fs.writeFileSync(output,Buffer.concat([sizePickle,jsonPickle,...blocks]));
console.log(JSON.stringify({originalSha256:crypto.createHash('sha256').update(original).digest('hex'),patchedSha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),changed:[...replacements.keys()]}));
