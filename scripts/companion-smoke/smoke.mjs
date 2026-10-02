import { app, BrowserWindow, protocol, session } from 'electron'
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { loadPetRegistry, petEntryView } from '../../lib/index.js'

const root = resolve(import.meta.dirname,'../..')
// Hidden native windows may return an old compositor surface on Windows.
// Use the same production bridge with offscreen rendering in this fixture only.
const fixtureMain=join(root,'desktop','.companion-smoke-offscreen.mjs')
const productionMain=readFileSync(join(root,'desktop/pet-main.js'),'utf8')
if (!productionMain.includes('spellcheck: false, devTools: false')) throw new Error('Unknown window fixture seam')
writeFileSync(fixtureMain,productionMain.replace('spellcheck: false, devTools: false','offscreen: true, spellcheck: false, devTools: false'))
const { installDesktopPet }=await import(pathToFileURL(fixtureMain))
const output = join(root,'output/companion-verification')
mkdirSync(output,{recursive:true})
mkdirSync(join(output,'user-data'),{recursive:true})
app.setPath('userData',join(output,'user-data'))
protocol.registerSchemesAsPrivileged([{scheme:'dsh-app',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}])
// The fixture creates real sandboxed production windows without showing them.
BrowserWindow.prototype.showInactive = function () {}
const report = {checks:[],errors:[],assetRequests:[]}
const pause = ms=>new Promise(resolve=>setTimeout(resolve,ms))
const check = (name,pass,detail) => {
  report.checks.push({name,pass,detail})
  if (!pass) throw new Error(name+': '+JSON.stringify(detail))
}
let owner
let current
app.on('web-contents-created',(_event,wc)=> {
  wc.on('console-message',(_event,level,message)=> { if (level>=3) report.errors.push(message) })
  wc.on('preload-error',(_event,_path,error)=>report.errors.push(error.message))
})

app.whenReady().then(async()=> {
  const registry = loadPetRegistry({packageRoot:root,singlePet:true,petsDir:'',dshPetsDir:''})
  check('three companions resolve',registry.entries.length===3,registry.warnings)
  const definitions = registry.entries.map(entry=>petEntryView(entry,registry.globalVoice))
  const makeState = (id,animation='idle',palette='ds',extra={}) => {
    const pet = definitions.find(entry=>entry.id===id)
    const phase = animation==='jumping'?'done':animation==='failed'?'failed':animation==='waiting'?'waiting':animation==='review'?'review':animation==='idle'?'idle':'thinking'
    return {
      pet:{id,displayName:pet.displayName,description:pet.description},name:pet.displayName,
      animation,phase,sessionActive:true,animationStartedAt:Date.now(),
      affinity:{points:25,rank:'伙伴',rankEmoji:'**',pets:0,feeds:0,turns:1,petCooldown:false,feedCooldown:false},treats:{stocked:3,max:5},
      display:{visible:true,size:160,right:24,bottom:20,bubbleScale:1,desktopEnabled:true,multiPetEnabled:true,animationMode:'tick',animationFps:12,animationTickSlope:1/6,animationTickIntercept:6},
      ...(pet.gameplay?{gameplay:{stats:{hunger:100,mood:100,energy:100,affection:100},mode:null}}:{}),
      companions:[{sessionId:'fixture',primary:true,color:{palette},animation,phase,sessionActive:true,performance:{tokensPerSecond:60,source:'sessionStats',sessionId:'fixture'},...extra}],sessions:[],
    }
  }
  current = makeState('miku')
  owner = new BrowserWindow({show:false,webPreferences:{preload:join(import.meta.dirname,'owner-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}})
  session.defaultSession.protocol.handle('dsh-app',()=>new Response('<!doctype html><title>Companion fixture</title>',{headers:{'content-type':'text/html'}}))
  installDesktopPet({owner:()=>owner,openMain:()=>{},request:async(path,method,body)=> {
    if (path.startsWith('/api/pet/state')) return Response.json(current)
    if (path==='/api/pet/pets') return Response.json(definitions)
    if (path==='/api/pet/interact') return Response.json({ok:true,reaction:'收到',delta:1})
    if (path.startsWith('/api/pet/gameplay/')) return Response.json({ok:true,view:current.gameplay})
    if (path.startsWith('/pet/')) {
      const parts=path.split('/'),entry=registry.byId(decodeURIComponent(parts[2])),rel=parts.slice(3).join('/')
      if (entry && entry.servable.includes(rel)) {
        report.assetRequests.push(path)
        return new Response(readFileSync(join(entry.dir,rel)),{headers:{'content-type':rel.endsWith('.png')?'image/png':'image/webp'}})
      }
      report.errors.push('Asset rejected: '+path)
    }
    return new Response(null,{status:404})
  }})
  await owner.loadURL('dsh-app://app/')
  const refresh=async()=> {
    await owner.webContents.executeJavaScript("window.companionTest.configure({enabled:true,currentSessionId:'fixture'})")
    await pause(220)
    const pet = BrowserWindow.getAllWindows().find(win=>win.webContents.getURL()==='dsh-app://pet/index.html')
    if (!pet) throw new Error('No native pet window')
    return pet
  }
  let win=await refresh()
  await pause(1600)
  const inspect=()=>win.webContents.executeJavaScript(`(() => {
    const sprite=document.querySelector('[data-dsh-pet-animation]'),canvas=document.querySelector('canvas[data-dsh-pet-frames2d]');
    const rect=sprite?.getBoundingClientRect();
    return {animation:sprite?.dataset.dshPetAnimation,track:canvas?.dataset.dshPetTrack,pixels:canvas?.getContext('2d')?.getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0),atlas:sprite?.style.backgroundImage,position:sprite?.style.backgroundPosition,width:rect?.width,height:rect?.height,canvases:document.querySelectorAll('canvas[data-dsh-pet-frames2d]').length,connected:document.body.dataset.connected,html:document.body.innerHTML.slice(0,1200)};
  })()`)
  const motions=['idle','running-right','running-left','waving','jumping','failed','waiting','running','review']
  for (const id of ['miku','blue-whale-business']) {
    for (const animation of motions) {
      current=makeState(id,animation)
      win=await refresh()
      const info=await inspect()
      check(id+' renders '+animation,id==='miku'?info.track===animation && info.pixels:info.animation===animation && !!info.atlas,info)
    }
    for (const palette of ['ds','gpt','claude','kimi','glm']) {
      current=makeState(id,'running-right',palette)
      win=await refresh()
      const info=await inspect()
      check(id+' loads '+palette,id==='miku'?info.pixels && report.assetRequests.some(path=>path.includes(palette==='ds'?'/miku/thumb/running-right/':'/miku/palettes/'+palette+'/thumb/running-right/')):info.atlas.includes('/palettes/'+palette+'.png'),info)
    }
    current=makeState(id,'running-right')
    win=await refresh()
    await pause(150)
    const screenshot=await win.webContents.capturePage()
    writeFileSync(join(output,id+'.png'),screenshot.toPNG())
  }
  current=makeState('miku','running-right')
  win=await refresh()
  const before=await inspect()
  current.companions[0].performance.tokensPerSecond=240
  win=await refresh()
  const after=await inspect()
  check('MIKU footer FPS update keeps one decoded-frame canvas',before.canvases===1&&after.canvases===1&&after.track==='running-right',after)
  current=makeState('blue-whale-business','idle')
  win=await refresh()
  const whale=await inspect()
  check('business whale keeps its 3:2 render geometry',whale.width===240&&whale.height===160,whale)
  // Decode actual window pixels. Stationary actions must keep exactly the
  // same legs, including after a palette/state change and another frame tick.
  const planted=['idle','waving','failed','waiting','running','review']
  const captures=[]
  for (const palette of ['ds','gpt','claude','kimi','glm']) {
    let legHash
    for (const animation of planted) {
      current=makeState('whale-girl-refined',animation,palette)
      win=await refresh()
      const geometry=await win.webContents.executeJavaScript(`(() => {
        const sprite=document.querySelector('[data-dsh-pet-animation]'),frame=document.querySelector('[data-dsh-pet-registered-frame]'),legs=document.querySelector('[data-dsh-pet-planted]');
        const r=sprite.getBoundingClientRect();
        return {x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height),planted:getComputedStyle(legs).display!=='none',track:frame.dataset.track,transform:frame.style.transform};
      })()`)
      check('whale '+palette+' planted '+animation,geometry.planted&&!!geometry.transform,geometry)
      const screenshot=await win.webContents.capturePage({x:geometry.x,y:geometry.y,width:geometry.width,height:geometry.height})
      const dimensions=screenshot.getSize()
      const lowerY=Math.ceil(dimensions.height*174/208)
      const lower=screenshot.crop({x:Math.ceil(dimensions.width*63/192),y:lowerY,width:Math.floor(dimensions.width*43/192),height:dimensions.height-lowerY}).toBitmap()
      const hash=createHash('sha256').update(lower).digest('hex')
      if (palette==='ds') writeFileSync(join(output,'whale-stable-'+animation+'.png'),screenshot.toPNG())
      if (legHash===undefined) legHash=hash
      check('whale '+palette+' legs unchanged in '+animation,hash===legHash,{hash,legHash})
      if (animation!=='failed') {
        const pixels=screenshot.toBitmap()
        let top=dimensions.height,bottom=-1
        for (let y=0;y<dimensions.height;y++) for (let x=0;x<dimensions.width;x++) {
          if (pixels[(y*dimensions.width+x)*4+3]>128) { top=Math.min(top,y); bottom=Math.max(bottom,y) }
        }
        check('whale '+palette+' stable upright height in '+animation,
          Math.abs(top-dimensions.height*15/208)<=2 && Math.abs(bottom-dimensions.height*202/208)<=2,
          {top,bottom,height:dimensions.height})
      }
      if (palette==='ds') {
        const path=join(output,'whale-stable-'+animation+'.png')
        writeFileSync(path,screenshot.toPNG())
        captures.push({animation,path})
      }
    }
  }
  for (const animation of ['running-right','running-left','jumping']) {
    current=makeState('whale-girl-refined',animation)
    win=await refresh()
    const hidden=await win.webContents.executeJavaScript("getComputedStyle(document.querySelector('[data-dsh-pet-planted]')).display==='none'")
    check('whale keeps leg motion for '+animation,hidden)
  }
  report.whalePreviews=captures
  check('no renderer, preload or missing-asset errors',report.errors.length===0,report.errors)
  report.success=true
}).catch(error=> { report.success=false; report.error=error.stack; process.exitCode=1 }).finally(()=> {
  writeFileSync(join(output,'native-results.json'),JSON.stringify(report,null,2))
  console.log(JSON.stringify({success:report.success,checks:report.checks.length,error:report.error}))
  unlinkSync(fixtureMain)
  app.quit()
})
setTimeout(()=> { report.success=false; report.error='Companion fixture timeout'; writeFileSync(join(output,'native-results.json'),JSON.stringify(report,null,2)); app.exit(1) },60000).unref()
