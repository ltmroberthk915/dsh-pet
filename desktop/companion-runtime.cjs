const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// The application archive and updater are deliberately absent: this is a
// private copy of Electron's runtime, with our own application entry point.
const required = ['chrome_100_percent.pak', 'chrome_200_percent.pak', 'd3dcompiler_47.dll',
  'ffmpeg.dll', 'icudtl.dat', 'resources.pak', 'v8_context_snapshot.bin'];
const optional = ['snapshot_blob.bin', 'dxcompiler.dll', 'dxil.dll', 'vk_swiftshader.dll',
  'vk_swiftshader_icd.json', 'vulkan-1.dll', 'LICENSE.electron.txt', 'LICENSES.chromium.html'];
const bootstrap = `const {app,protocol}=require('electron');
protocol.registerSchemesAsPrivileged([{scheme:'dsh-app',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
app.on('window-all-closed',()=>{});
const input=process.env.DSH_PET_BOOTSTRAP;delete process.env.DSH_PET_BOOTSTRAP;
try{if(!input||input.length>16384)throw Error('Invalid desktop bootstrap');const config=JSON.parse(input);
require(config.module).start(config).catch(error=>{console.error(error);app.exit(1)})}catch(error){console.error(error);app.exit(1)}
`;
async function digest(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function regular(file, base) {
  const resolved = await fs.realpath(file);
  if (!resolved.startsWith(base + path.sep) || !(await fs.stat(resolved)).isFile()) throw Error('Invalid desktop runtime file: ' + path.basename(file));
  return resolved;
}
async function prepareRuntime(appExecutable, cacheDir) {
  const executable = await fs.realpath(appExecutable), source = path.dirname(executable);
  if (path.basename(executable).toLowerCase() !== 'deepseek harness.exe') throw Error('需要原生 Windows DSH 的 Electron 运行库。');
  const files = [['DshPetDesktop.exe', executable]];
  for (const name of required) files.push([name, await regular(path.join(source, name), source)]);
  for (const name of optional) {
    try { files.push([name, await regular(path.join(source, name), source)]); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (const name of (await fs.readdir(path.join(source, 'locales'))).sort()) {
    if (/^[a-zA-Z0-9-]+\.pak$/.test(name)) files.push(['locales/' + name, await regular(path.join(source, 'locales', name), source)]);
  }
  if (!files.some(([name]) => name === 'locales/en-US.pak')) throw Error('Desktop runtime locales are missing.');
  const fingerprints = {};
  for (const [name, file] of files) fingerprints[name] = await digest(file);
  const key = createHash('sha256').update(JSON.stringify(fingerprints)).update(bootstrap).digest('hex');
  await fs.mkdir(cacheDir, { recursive: true });
  const root = await fs.realpath(cacheDir), target = path.join(root, 'electron-' + key);
  const application = { 'resources/app/package.json': JSON.stringify({ name: 'dsh-pet-desktop', version: '1.0.0', main: 'main.cjs' }), 'resources/app/main.cjs': bootstrap };
  async function verify(dir) {
    if (await fs.realpath(dir) !== dir) throw Error('Desktop cache must not redirect to another directory.');
    for (const [name, hash] of Object.entries(fingerprints)) if (await digest(await regular(path.join(dir, name), dir)) !== hash) throw Error('Desktop runtime cache checksum mismatch: ' + name);
    for (const [name, content] of Object.entries(application)) if (await fs.readFile(await regular(path.join(dir, name), dir), 'utf8') !== content) throw Error('Desktop bootstrap checksum mismatch.');
  }
  try { await verify(target); return path.join(target, 'DshPetDesktop.exe'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const stage = await fs.mkdtemp(path.join(root, 'stage-'));
  try {
    for (const [name, file] of files) {
      const destination = path.join(stage, name);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(file, destination); // Never hard-link a writable cache to the host installation.
    }
    for (const [name, content] of Object.entries(application)) {
      await fs.mkdir(path.dirname(path.join(stage, name)), { recursive: true });
      await fs.writeFile(path.join(stage, name), content, { flag: 'wx' });
    }
    await verify(stage);
    try { await fs.rename(stage, target); }
    catch (error) { if (!['EEXIST', 'ENOTEMPTY', 'EPERM'].includes(error.code)) throw error; await verify(target); }
    return path.join(target, 'DshPetDesktop.exe');
  } finally {
    const checked = path.resolve(stage);
    if (path.dirname(checked) !== root || !path.basename(checked).startsWith('stage-')) throw Error('Invalid runtime staging cleanup.');
    await fs.rm(checked, { recursive: true, force: true });
  }
}
function nativeDesktopExecutable() {
  return process.platform === 'win32' && process.env.ELECTRON_RUN_AS_NODE === '1'
    && path.basename(process.execPath).toLowerCase() === 'deepseek harness.exe'
    && process.argv.some(arg => /[\\/]dsh-desktop-host[\\/]lib[\\/]index\.js$/.test(arg))
    ? process.execPath : undefined;
}
function childEnvironment() {
  const env = {};
  // A window renderer needs OS paths, not the Host's provider credentials or
  // Node injection flags. A one-use bootstrap variable is added by the caller
  // and removed by our main process before any renderer is created.
  for (const [key, value] of Object.entries(process.env)) if (/^(SystemRoot|WINDIR|COMSPEC|PATH|PATHEXT|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|HOMEDRIVE|HOMEPATH|PROGRAMDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|COMMONPROGRAMFILES|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE|OS|LANG|LC_ALL)$/i.test(key)) env[key] = value;
  return env;
}
module.exports = { prepareRuntime, nativeDesktopExecutable, childEnvironment };
