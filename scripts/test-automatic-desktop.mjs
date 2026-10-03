/** Real Electron windows and the production Host controller; no live DSH mutation. */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { PetService, makePetRoutes, loadPetRegistry } from '../lib/index.js'
const require = createRequire(import.meta.url)
const { createCompanion } = require('../desktop/companion-host.cjs')
const { prepareRuntime, childEnvironment } = require('../desktop/companion-runtime.cjs')
const root = path.resolve(import.meta.dirname, '..')
const executable = process.argv[2]
if (!executable) throw Error('Supply the installed Windows DSH executable (read-only).')
const output = path.join(root, 'output/automatic-desktop-verification')
fs.mkdirSync(output, { recursive: true })
const run = fs.mkdtempSync(path.join(output, 'run-'))
const observed = path.join(run, 'windows.json'), entry = path.join(run, 'inspect.cjs')
const hostArchive = path.join(path.dirname(executable), 'resources/app.asar')
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const before = hash(hostArchive), checks = []
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); console.log('PASS ' + name) }
const wait = async condition => {
  const end = Date.now() + 45000
  while (Date.now() < end) { if (await condition()) return; await new Promise(resolve => setTimeout(resolve, 150)) }
  throw Error('Timed out: ' + condition.toString())
}
const readObserved = () => { try { return JSON.parse(fs.readFileSync(observed, 'utf8')) } catch { return {} } }
fs.writeFileSync(entry, `const {BrowserWindow,app}=require('electron');const fs=require('fs');
BrowserWindow.prototype.showInactive=function(){};
exports.start=async(config)=>{
 const base='http://127.0.0.1:'+config.port,auth={authorization:'Bearer '+config.token};
 const checks={unauth:(await fetch(base+'/control')).status,crossOrigin:(await fetch(base+'/control',{headers:{...auth,origin:'https://evil.example'}})).status,unknown:(await fetch(base+'/api/exec',{headers:auth})).status};
 await require(${JSON.stringify(path.join(root, 'desktop/companion-main.cjs'))}).start(config);
 let running=false;const timer=setInterval(async()=>{if(running)return;running=true;try{
 const windows=await Promise.all(BrowserWindow.getAllWindows().map(async w=>({preferences:w.webContents.getLastWebPreferences(),bounds:w.getBounds(),alwaysOnTop:w.isAlwaysOnTop(),...await w.webContents.executeJavaScript(\
 "(async()=>{const state=await window.dshPetOverlay.call('state');const sprite=document.querySelector('[data-dsh-pet-animation]');const frame=document.querySelector('[data-dsh-pet-registered-frame]');const canvas=document.querySelector('canvas[data-dsh-pet-frames2d]');return{petSession:state.sessionId,rate:state.performance?.tokensPerSecond,generation:state.generation,visualMotion:sprite?.dataset.dshPetAnimation,atlas:frame?.style.backgroundImage||sprite?.style.backgroundImage,canvasPixels:canvas?.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0),canvasTrack:canvas?.dataset.dshPetTrack,connected:document.body.dataset.connected,bridge:!!window.dshPetOverlay}})()") })));
 const first=BrowserWindow.getAllWindows()[0];
 if(first&&windows[0]?.bridge&&!checks.roundTrip){checks.roundTrip=await first.webContents.executeJavaScript(
 "(async()=>{const [state,pets]=await Promise.all([window.dshPetOverlay.call('state'),window.dshPetOverlay.call('pets')]);const result=await window.dshPetOverlay.call('rename',{name:'原生往返测试'});let renamed;const deadline=Date.now()+5000;do{renamed=await window.dshPetOverlay.call('state');if(renamed.name===result.name)break;await new Promise(resolve=>setTimeout(resolve,100))}while(Date.now()<deadline);let rejected=false;try{await window.dshPetOverlay.call('unknown-test-action')}catch{rejected=true}return{queries:!!state.pet&&Array.isArray(pets)&&pets.length===3,writeAcknowledged:result.ok===true,name:renamed.name,rejected}})()");}
 fs.writeFileSync(${JSON.stringify(observed)},JSON.stringify({pid:process.pid,checks,windows}));
 }catch{}finally{running=false}},200);app.on('before-quit',()=>clearInterval(timer));
};`)
const ctx = new Context()
const registry = loadPetRegistry({ packageRoot: root, singlePet: true, petsDir: '', dshPetsDir: '' })
const service = new PetService(ctx, { registry, persistDir: path.join(run, '中文 数据') })
await service.setConfig({ visible: true, desktopEnabled: true })
let routes, focused = 0
const options = { pluginDir: root, appExecutable: executable, cacheDir: path.join(output, '中文 缓存'), entry,
  diagnostic: text => process.stderr.write(text),
  enabled: () => service.display().visible && service.display().desktopEnabled !== false,
  routes: () => routes, openMain: () => focused++ }
const companion = createCompanion(options)
routes = makePetRoutes({ service, ctx, desktop: companion })
let extra
try {
  if (process.argv[3] === '--abrupt-owner') {
    companion.configure({ enabled: true })
    await wait(() => companion.status().active && readObserved().pid)
    fs.writeFileSync(process.argv[4], JSON.stringify({ pid: readObserved().pid }))
    process.exit(0) // Deliberately skip dispose to verify parent-loss cleanup.
  }
  const unavailable = createCompanion({ ...options, appExecutable: undefined })
  check('plain Node/web cannot launch a native companion', unavailable.configure({ enabled: true }).state === 'unavailable')
  unavailable.dispose()
  check('renderer environment omits provider secrets and Node injection flags', !Object.keys(childEnvironment()).some(k => /TOKEN|KEY|NODE_OPTIONS|ELECTRON_RUN_AS_NODE|DSH_/i.test(k)))
  companion.configure({ enabled: true, currentSessionId: 'fixture' })
  await wait(() => companion.status().active || companion.status().state === 'error')
  check('plugin starts a native window without patching or restarting DSH: ' + JSON.stringify(companion.status()), companion.status().active)
  await wait(() => readObserved().windows?.[0]?.bridge)
  const observation = readObserved(), native = observation.windows[0]
  check('private bridge rejects missing credentials', observation.checks.unauth === 403)
  check('private bridge rejects browser origins', observation.checks.crossOrigin === 403)
  check('private bridge cannot forward arbitrary host APIs', observation.checks.unknown === 404)
  check('native renderer completes concurrent state and catalog requests', observation.checks.roundTrip?.queries === true)
  check('native rename write returns through the real service and read path', observation.checks.roundTrip?.writeAcknowledged === true && observation.checks.roundTrip?.name === '原生往返测试')
  check('native renderer receives a rejected unknown action', observation.checks.roundTrip?.rejected === true)
  check('window retains sandbox, isolation and disabled Node', native.preferences.sandbox && native.preferences.contextIsolation && !native.preferences.nodeIntegration)
  check('window is independent and always on top', native.alwaysOnTop && observation.windows.length === 1)
  check('package and running window versions match', companion.status().version === JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version)
  check('public status does not expose the private token, port or executable', !/token|port|executable|cacheDir/.test(JSON.stringify(companion.status()).replace('supported', '')))
  await wait(() => readObserved().windows?.[0]?.atlas?.includes('whale-girl-refined'))
  check('whale assets load from the installed plugin', true)
  await service.setPetId('miku')
  await wait(() => readObserved().windows?.[0]?.canvasPixels === true)
  check('MIKU frame animation works in the automatic window', true)
  await service.setPetId('blue-whale-business')
  await wait(() => readObserved().windows?.[0]?.atlas?.includes('blue-whale-business'))
  check('business whale switches without replacing the host archive', true)
  ctx.provide('sessionProjections', { stateOf: session => ({ decodeTokens: session.rate * 10, decodeMs: 10000 }) })
  const parent = { id: 'parent', header: {}, rate: 30 }
  const child = { id: 'child', header: { origin: 'subagent' }, rate: 279 }
  ctx.emit('session/event', parent, { type: 'tool/call', data: { callId: 'wait', name: 'wait_agent', arguments: '{"timeout_ms":180000}' } })
  ctx.emit('agent/assistant-stream', { agent: { session: child }, frame: { type: 'chunk', attemptId: 'child-1', revision: 1, chunk: { type: 'reasoning-delta', index: 0, text: 'working' } } })
  await service.setConfig({ multiPetEnabled: true, animationMode: 'tick', animationTickSlope: 1, animationTickIntercept: 1 })
  companion.configure({ enabled: true, currentSessionId: child.id })
  const childWindow = () => readObserved().windows?.find(window => window.petSession === 'child')
  const parentWindow = () => readObserved().windows?.find(window => window.petSession === 'parent')
  await wait(() => childWindow()?.rate === 279 && childWindow()?.visualMotion === 'running-right' && parentWindow()?.visualMotion === 'waiting')
  check('opened subagent native renderer receives its own rate and running animation', childWindow().generation === 'reasoning')
  check('waiting parent stays still with its own rate while the child generates', parentWindow().rate === 30)
  child.rate = 160
  await wait(() => childWindow()?.rate === 160)
  check('subagent rate updates do not alter the parent rate', parentWindow().rate === 30)
  companion.configure({ enabled: true, currentSessionId: parent.id })
  await wait(() => readObserved().windows?.length === 1 && parentWindow()?.visualMotion === 'waiting')
  check('leaving the subagent restores the parent and removes the extra child window', true)
  await service.setConfig({ multiPetEnabled: false })
  companion.configure({ enabled: false })
  await wait(() => readObserved().windows?.length === 0)
  check('disabling desktop mode removes all native windows', !companion.status().active)
  companion.configure({ enabled: true })
  await wait(() => companion.status().active && readObserved().windows?.length === 1)
  check('re-enabling creates exactly one native window', true)
  check('reset is available without a host preload patch', companion.resetPosition().active)
  const pid = readObserved().pid
  companion.dispose()
  await wait(() => { try { process.kill(pid, 0); return false } catch { return true } })
  check('disposing the plugin closes the companion process', true)
  const marker = path.join(run, 'abrupt-owner.json')
  const owner = spawn(process.execPath, [path.resolve(import.meta.filename), executable, '--abrupt-owner', marker], { windowsHide: true, stdio: 'ignore' })
  const ownerExit = await new Promise((resolve, reject) => { owner.once('error', reject); owner.once('exit', resolve) })
  check('isolated owner can exit without invoking plugin cleanup', ownerExit === 0)
  const orphanPid = JSON.parse(fs.readFileSync(marker)).pid
  await wait(() => { try { process.kill(orphanPid, 0); return false } catch { return true } })
  check('abrupt Host loss closes the independent process automatically', true)
  let attempts = 0
  extra = createCompanion({ ...options, prepareRuntime: async (...args) => {
    if (++attempts === 1) throw Object.assign(Error('disk full'), { code: 'ENOSPC' })
    return prepareRuntime(...args)
  } })
  extra.configure({ enabled: true })
  await wait(() => extra.status().state === 'error')
  check('preparation failure is visible and preserves the host', extra.status().message.includes('磁盘空间不足') && hash(hostArchive) === before)
  extra.retry()
  await wait(() => extra.status().active || extra.status().state === 'error')
  check('retry recovers without installing another patch', extra.status().active)
  extra.dispose()
  check('original host archive is byte-for-byte unchanged', hash(hostArchive) === before)
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ success: true, checks, hostArchiveUnchanged: true }, null, 2))
} catch (error) {
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ success: false, checks, error: error.stack, status: companion.status() }, null, 2))
  throw error
} finally { companion.dispose(); extra?.dispose(); }
