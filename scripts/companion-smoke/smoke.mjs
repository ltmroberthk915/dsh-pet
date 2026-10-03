import { app, BrowserWindow, protocol, session, screen } from 'electron'
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
    return {animation:sprite?.dataset.dshPetAnimation,track:canvas?.dataset.dshPetTrack,pixels:canvas?.getContext('2d')?.getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0),atlas:document.querySelector('[data-dsh-pet-registered-frame]')?.style.backgroundImage||sprite?.style.backgroundImage,position:sprite?.style.backgroundPosition,width:rect?.width,height:rect?.height,canvases:document.querySelectorAll('canvas[data-dsh-pet-frames2d]').length,connected:document.body.dataset.connected,html:document.body.innerHTML.slice(0,1200)};
  })()`)
  // Exercise a real renderer pointer capture while the native cursor remains
  // held still. Only this isolated fixture owns the fake screen cursor.
  const realCursor = screen.getCursorScreenPoint
  const boundsBeforeHold = win.getBounds()
  const spriteRect = await win.webContents.executeJavaScript(`(() => {
    const r=document.querySelector('[data-dsh-pet-animation]').getBoundingClientRect();
    return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};
  })()`)
  let cursor = {x:boundsBeforeHold.x+spriteRect.x,y:boundsBeforeHold.y+spriteRect.y}
  screen.getCursorScreenPoint = () => cursor
  win.setIgnoreMouseEvents(false)
  win.webContents.focus()
  await win.webContents.executeJavaScript(`window.testPointerEvents=[];for(const type of ['pointerdown','pointermove','pointerup','lostpointercapture','blur'])window.addEventListener(type,e=>window.testPointerEvents.push({type:e.type,x:e.clientX,y:e.clientY,sx:e.screenX,sy:e.screenY,buttons:e.buttons,target:e.target.outerHTML?.slice(0,250)}),true)`)
  win.webContents.sendInputEvent({type:'mouseMove',...spriteRect})
  win.webContents.sendInputEvent({type:'mouseDown',...spriteRect,button:'left',clickCount:1})
  await pause(100)
  const pressed = await inspect()
  report.holdBeforeMove = {track:pressed.track,bounds:win.getBounds()}
  cursor = {x:cursor.x+30,y:cursor.y+20}
  win.webContents.sendInputEvent({type:'mouseMove',x:spriteRect.x+30,y:spriteRect.y+20,modifiers:['leftButtonDown']})
  await pause(100)
  const heldBounds = win.getBounds()
  report.holdSamples=[]
  for (let i=0;i<150;i++) {
    // Native window moves generate fresh pointer events with changed local
    // coordinates. They must never accumulate into another window movement.
    win.webContents.sendInputEvent({type:'mouseMove',...spriteRect,modifiers:['leftButtonDown']})
    await pause(100)
    const rect=await win.webContents.executeJavaScript(`(() => {const r=document.querySelector('[data-dsh-pet-animation]').getBoundingClientRect();return {x:r.x,y:r.y}})()`)
    report.holdSamples.push({bounds:win.getBounds(),rect,track:(await inspect()).track})
  }
  win.webContents.sendInputEvent({type:'mouseUp',...spriteRect,button:'left',clickCount:1})
  await pause(50)
  screen.getCursorScreenPoint = realCursor
  report.pointerEvents=await win.webContents.executeJavaScript('window.testPointerEvents')
  check('MIKU press owns the pose before pointer movement',pressed.track==='drag',report.holdBeforeMove)
  check('MIKU held drag keeps native origin',report.holdSamples.every(s=>s.bounds.x===heldBounds.x&&s.bounds.y===heldBounds.y),{heldBounds,samples:report.holdSamples})
  check('MIKU held drag keeps renderer origin',report.holdSamples.every(s=>s.rect.x===report.holdSamples[0].rect.x&&s.rect.y===report.holdSamples[0].rect.y),report.holdSamples)
  check('MIKU stays in drag pose for a 15 second hold',report.holdSamples.every(s=>s.track==='drag'),report.holdSamples)
  // Remount after the release/standup sequence so gesture feedback does not
  // leak into the independent activity/palette rendering assertions below.
  current=makeState('blue-whale-business')
  win=await refresh()
  // Offscreen input has screenX/Y=0, so Chromium treats the release as a
  // click too. Let the normal 2.6s pet-feedback lifetime finish before QA.
  await pause(2800)
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
  check('business whale uses 75% artwork and hit-box size',whale.width===180&&whale.height===120,whale)
  check('business whale has a smaller native canvas',win.getBounds().width===315&&win.getBounds().height===345,win.getBounds())
  for (const size of [32,320,1024]) {
    current.display.size=size
    win=await refresh()
    const resized=await inspect()
    check('business whale scales its whole base at '+size,resized.width===Math.round(size*.75*1.5)&&resized.height===Math.round(size*.75),resized)
  }
  current.display.size=160
  current.companions[0].primary=false
  win=await refresh()
  const secondaryWhale=await inspect()
  check('background whale combines the 52.7% and 75% scales once',secondaryWhale.width===95&&secondaryWhale.height===63,secondaryWhale)
  current.companions[0].primary=true
  win=await refresh()
  const hoverPet=()=>win.webContents.executeJavaScript(`document.querySelector('[data-dsh-pet-animation]').dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}))`)
  const panelShown=()=>win.webContents.executeJavaScript(`!!document.querySelector('[data-pet-care-panel]')`)
  await hoverPet(); await pause(40)
  check('native care panel stays closed on hover by default',!await panelShown())
  await win.webContents.executeJavaScript(`document.querySelector('[data-dsh-pet-animation]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))`)
  await pause(40)
  check('native care panel remains accessible by right click',await panelShown())
  current.display.hoverPanelEnabled=true
  win=await refresh()
  await hoverPet(); await pause(40)
  check('enabling hover panels restores automatic expansion',await panelShown())
  current.display.hoverPanelEnabled=false
  win=await refresh()
  await hoverPet(); await pause(40)
  check('disabling hover panels immediately closes an open panel',!await panelShown())
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
      check('whale '+palette+' preserves whole drawing '+animation,!geometry.planted&&geometry.transform.endsWith('scale(1)'),geometry)
      const screenshot=await win.webContents.capturePage({x:geometry.x,y:geometry.y,width:geometry.width,height:geometry.height})
      const dimensions=screenshot.getSize()
      const lowerY=Math.ceil(dimensions.height*174/208)
      const lower=screenshot.crop({x:Math.ceil(dimensions.width*63/192),y:lowerY,width:Math.floor(dimensions.width*43/192),height:dimensions.height-lowerY}).toBitmap()
      const hash=createHash('sha256').update(lower).digest('hex')
      if (palette==='ds') writeFileSync(join(output,'whale-stable-'+animation+'.png'),screenshot.toPNG())
      if (legHash===undefined) legHash=hash
      check('whale '+palette+' complete visible legs '+animation,lower.some((v,i)=>i%4===3&&v>128),{hash})
      if (animation!=='failed') {
        const pixels=screenshot.toBitmap()
        let top=dimensions.height,bottom=-1
        for (let y=0;y<dimensions.height;y++) for (let x=0;x<dimensions.width;x++) {
          if (pixels[(y*dimensions.width+x)*4+3]>128) { top=Math.min(top,y); bottom=Math.max(bottom,y) }
        }
        check('whale '+palette+' stable upright height in '+animation,
          top>0 && bottom<dimensions.height-1 && bottom>dimensions.height*.85,
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
  // The actual production compositor must hold the entire idle character
  // still between blinks, not just keep a synthetic leg strip unchanged.
  current=makeState('whale-girl-refined','idle')
  win=await refresh()
  await pause(180)
  const idleHashes=[]
  for(let i=0;i<4;i++) {
    const shot=await win.webContents.capturePage()
    idleHashes.push(createHash('sha256').update(shot.toBitmap()).digest('hex'))
    await pause(650)
  }
  check('whale idle whole-image pixels remain unchanged between blinks',new Set(idleHashes).size===1,idleHashes)
  for(const id of ['whale-girl-refined','blue-whale-business']) for (const scenario of [
    { label:'uncapped running', animation:'running-right', limit:0, actions:0, min:20, max:120 },
    { label:'user-capped running', animation:'running-left', limit:8, actions:0, min:6, max:11 },
    { label:'independent other-action FPS', animation:'jumping', limit:8, actions:4, min:2, max:6 },
  ]) {
    current=makeState(id,scenario.animation)
    Object.assign(current.display,{animationTickSlope:1,animationTickIntercept:1,animationRunFpsLimit:scenario.limit,animationActionFps:scenario.actions})
    current.companions[0].performance.tokensPerSecond=293
    win=await refresh()
    const timings=await win.webContents.executeJavaScript(`new Promise(resolve=>{
      const el=document.querySelector('[data-dsh-pet-registered-frame]');
      let previous=el.dataset.column, changes=[];
      const started=performance.now();
      const observer=new MutationObserver(()=>{if(el.dataset.column!==previous){previous=el.dataset.column;changes.push(performance.now()-started)}});
      observer.observe(el,{attributes:true,attributeFilter:['data-column']});
      setTimeout(()=>{observer.disconnect();resolve(changes)},1100);
    })`)
    check(id+' '+scenario.label,timings.length>=scenario.min&&timings.length<=scenario.max,timings)
  }
  check('no renderer, preload or missing-asset errors',report.errors.length===0,report.errors)
  report.success=true
}).catch(error=> { report.success=false; report.error=error.stack; process.exitCode=1 }).finally(()=> {
  writeFileSync(join(output,'native-results.json'),JSON.stringify(report,null,2))
  console.log(JSON.stringify({success:report.success,checks:report.checks.length,error:report.error}))
  unlinkSync(fixtureMain)
  app.quit()
})
setTimeout(()=> { report.success=false; report.error='Companion fixture timeout'; writeFileSync(join(output,'native-results.json'),JSON.stringify(report,null,2)); app.exit(1) },60000).unref()
