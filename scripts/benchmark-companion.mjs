import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { Context } from '@deepseek-ai/cordis'
import { PetService, makePetRoutes, loadPetRegistry } from '../lib/index.js'
const root = path.resolve(import.meta.dirname, '..'), require = createRequire(import.meta.url)
const output = path.join(root, 'output/startup-performance')
const executable = process.argv[2]
if (!executable) throw Error('Supply the installed DSH executable (read only).')
fs.copyFileSync(path.join(root, 'desktop/archive-support.cjs'), path.join(output, 'before/desktop/archive-support.cjs'))
const registry = loadPetRegistry({ packageRoot: root, singlePet: true, petsDir: '', dshPetsDir: '' })
const results = []
for (const [name, host, runtime] of [
  ['before', 'before/desktop/companion-host.cjs', 'before/desktop/companion-runtime.cjs'],
  ['after', '../../desktop/companion-host.cjs', '../../desktop/companion-runtime.cjs'],
]) {
  const { createCompanion } = require(path.resolve(output, host))
  const { prepareRuntime } = require(path.resolve(output, runtime))
  for (let run = 1; run <= 2; run++) {
    const dir = fs.mkdtempSync(path.join(output, 'native-' + name + '-'))
    const observed = path.join(dir, 'observed.json'), entry = path.join(dir, 'inspect.cjs')
    fs.writeFileSync(entry, `exports.start=async config=>{
      const {app,BrowserWindow}=require('electron'),fs=require('node:fs');
      BrowserWindow.prototype.showInactive=function(){};
      await require(${JSON.stringify(path.join(root, 'desktop/companion-main.cjs'))}).start(config);
      let busy=false;const timer=setInterval(async()=>{if(busy)return;busy=true;try{
        const win=BrowserWindow.getAllWindows()[0];if(!win)return;
        const ready=await win.webContents.executeJavaScript("document.body.dataset.connected==='true' && !!document.querySelector('[data-dsh-pet-animation]')");
        if(ready){const metrics=app.getAppMetrics();fs.writeFileSync(${JSON.stringify(observed)},JSON.stringify({pid:process.pid,processes:metrics.length,workingSetMB:metrics.reduce((s,m)=>s+m.memory.workingSetSize,0)/1024}));clearInterval(timer)}
      }catch{}finally{busy=false}},50);
      app.on('before-quit',()=>clearInterval(timer));
    };`)
    const ctx = new Context(), service = new PetService(ctx, { registry, persistDir: path.join(dir, 'pet') })
    await service.setConfig({ visible: true, desktopEnabled: true })
    let routes, runtimeMetrics
    const companion = createCompanion({ pluginDir: root, appExecutable: executable, cacheDir: dir, entry,
      enabled: () => true, routes: () => routes, startupDelayMs: 0,
      prepareRuntime: (...args) => prepareRuntime(args[0], path.join(output, 'runtime'), { onMeasure: value => { runtimeMetrics = value } }),
    })
    routes = makePetRoutes({ service, ctx, desktop: companion })
    const start = performance.now()
    try {
      companion.configure({ enabled: true, currentSessionId: '' })
      while (!fs.existsSync(observed)) {
        if (performance.now() - start > 30000 || companion.status().state === 'error') throw Error(JSON.stringify(companion.status()))
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      const result = { name, run, windowReadyMs: Math.round(performance.now() - start), ...JSON.parse(fs.readFileSync(observed)), runtimeMetrics }
      results.push(result); console.log(JSON.stringify(result))
    } finally { companion.dispose() }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}
fs.writeFileSync(path.join(output, 'native-benchmark.json'), JSON.stringify(results, null, 2) + '\n')
