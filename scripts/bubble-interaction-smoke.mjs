import { app, BrowserWindow, protocol, session, screen, ipcMain } from 'electron'
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadPetRegistry, petEntryView } from '../lib/index.js'

const root = resolve(import.meta.dirname, '..')
const output = join(root, 'output/bubble-interaction-verification')
mkdirSync(join(output, 'native-user-data'), { recursive: true })
app.setPath('userData', join(output, 'native-user-data'))
protocol.registerSchemesAsPrivileged([{ scheme: 'dsh-app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }])
const fixture = join(root, 'desktop/.bubble-interaction-offscreen.mjs')
writeFileSync(fixture, readFileSync(join(root, 'desktop/pet-main.js'), 'utf8')
  .replace('spellcheck: false, devTools: false', 'offscreen: true, spellcheck: false, devTools: false'))
const { installDesktopPet } = await import(pathToFileURL(fixture))
BrowserWindow.prototype.showInactive = function () {}
const ignored = new Map(), regions = new Map()
const setIgnore = BrowserWindow.prototype.setIgnoreMouseEvents
BrowserWindow.prototype.setIgnoreMouseEvents = function (value, options) { ignored.set(this.id, value); return setIgnore.call(this, value, options) }
ipcMain.on('dsh-pet-v1:interactive', (event, _hit, value) => regions.set(event.sender.id, value))
const report = { checks: [], errors: [], opens: [], interactions: 0 }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const check = (name, pass, detail) => {
  report.checks.push({ name, pass, detail })
  if (!pass) throw Error(name + ': ' + JSON.stringify(detail))
}
app.on('web-contents-created', (_event, wc) => {
  wc.on('console-message', (_event, level, message) => { if (level >= 3) report.errors.push(message) })
  wc.on('preload-error', (_event, _path, error) => report.errors.push(error.message))
})
let current, owner, originalCursor, cursor = { x: 0, y: 0 }

app.whenReady().then(async () => {
  originalCursor = screen.getCursorScreenPoint
  screen.getCursorScreenPoint = () => cursor
  const registry = loadPetRegistry({ packageRoot: root, singlePet: true, petsDir: '', dshPetsDir: '' })
  const definitions = registry.entries.map(entry => petEntryView(entry))
  const state = (id, bubbleOnly = false) => ({
    pet: { id, displayName: registry.byId(id).displayName, description: '' }, name: '任务助手',
    display: { visible: true, desktopEnabled: true, multiPetEnabled: false, bubbleOnly, hoverPanelEnabled: false,
      size: 160, bubbleScale: 1, right: 24, bottom: 120 },
    currentSessionId: 'fixture', animation: 'idle', phase: 'idle', sessionActive: true,
    affinity: { points: 0, rank: '幼鲸', pets: 0, feeds: 0, turns: 0 }, treats: { stocked: 3, max: 5 }, sessions: [],
  })
  current = state('whale-girl-refined')
  owner = new BrowserWindow({ show: false, webPreferences: { preload: join(root, 'scripts/companion-smoke/owner-preload.cjs'), sandbox: true, contextIsolation: true } })
  session.defaultSession.protocol.handle('dsh-app', () => new Response('<title>Isolated DSH fixture</title>', { headers: { 'content-type': 'text/html' } }))
  installDesktopPet({ owner: () => owner, openMain: id => report.opens.push(id ?? null), request: async (path) => {
    if (path.startsWith('/api/pet/state')) return Response.json(current)
    if (path === '/api/pet/pets') return Response.json(definitions)
    if (path === '/api/pet/interact') { report.interactions++; return Response.json({ ok: true, reaction: '收到', delta: 1 }) }
    if (path.startsWith('/pet/')) {
      const parts = path.split('/'), entry = registry.byId(decodeURIComponent(parts[2])), file = parts.slice(3).join('/')
      if (entry?.servable.includes(file)) return new Response(readFileSync(join(entry.dir, file)), { headers: { 'content-type': file.endsWith('.png') ? 'image/png' : 'image/webp' } })
    }
    return new Response(null, { status: 404 })
  } })
  await owner.loadURL('dsh-app://app/')
  const refresh = async () => {
    await owner.webContents.executeJavaScript("window.companionTest.configure({enabled:true,currentSessionId:'fixture'})")
    await pause(350)
    const win = BrowserWindow.getAllWindows().find(w => w.webContents.getURL() === 'dsh-app://pet/index.html')
    check('native window remains available', !!win)
    return win
  }
  const move = async (win, x, y) => {
    const bounds = win.getBounds()
    cursor = { x: bounds.x + x, y: bounds.y + y }
    win.webContents.sendInputEvent({ type: 'mouseMove', x, y })
    await pause(70)
  }
  const click = async (win, x, y, button) => {
    await move(win, x, y)
    win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button, clickCount: 1 })
    win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button, clickCount: 1 })
    await pause(180)
  }
  let win
  for (const id of ['whale-girl-refined', 'miku', 'blue-whale-business']) {
    current = state(id)
    win = await refresh()
    await pause(350)
    const geometry = await win.webContents.executeJavaScript(`(() => { const el=document.querySelector('[data-dsh-pet-animation]'), r=el.getBoundingClientRect(); return {left:r.left,top:r.top,width:r.width,height:r.height,envelope:el.dataset.dshPetHit,clip:el.style.clipPath}; })()`)
    check(id + ' uses its idle silhouette', geometry.envelope === id + ':idle' && geometry.clip.startsWith('polygon('), geometry)
    const mask = regions.get(win.webContents.id)
    const area = mask.reduce((sum, [, , w, h]) => sum + w * h, 0)
    check(id + ' removes at least 35% of its old rectangular hit area', area < geometry.width * geometry.height * .65, { area, original: geometry.width * geometry.height })
    await move(win, Math.ceil(geometry.left + 1), Math.ceil(geometry.top + 1))
    check(id + ' passes through a transparent corner', ignored.get(win.id) === true)
    const [x, y, w, h] = mask[Math.floor(mask.length / 2)]
    await move(win, Math.round(x + w / 2), Math.round(y + h / 2))
    check(id + ' retains native input over its visible body', ignored.get(win.id) === false)
  }
  let [x, y, w, h] = regions.get(win.webContents.id)[8]
  x = Math.round(x + w / 2); y = Math.round(y + h / 2)
  await click(win, x, y, 'left')
  check('one left click opens the DSH session without petting', report.opens.length === 1 && report.opens[0] === 'fixture' && report.interactions === 0,
    { opens: [...report.opens], interactions: report.interactions })
  await click(win, x, y, 'right')
  const panel = await win.webContents.executeJavaScript("!!document.querySelector('[data-pet-care-panel]')")
  check('one right click pets and opens the care panel without opening DSH', report.interactions === 1 && panel && report.opens.length === 1, { interactions: report.interactions, panel })
  await pause(2700)

  current = state('miku', true)
  win = await refresh()
  const inspectBubble = () => win.webContents.executeJavaScript(`(() => { const el=document.querySelector('[data-pet-status-entry]'),r=el?.getBoundingClientRect(); return {text:el?.textContent,images:document.querySelectorAll('[data-dsh-pet-animation],canvas,img,[data-dsh-pet-decoration]').length,left:r?.left,top:r?.top,width:r?.width,height:r?.height}; })()`)
  let bubble = await inspectBubble()
  check('bubble-only mode displays ready text and loads no character renderer', bubble.text === '随时就绪' && bubble.images === 0, bubble)
  await pause(1200)
  check('ready text remains visible through subsequent host polls', (await inspectBubble()).text === '随时就绪')
  writeFileSync(join(output, 'bubble-only-ready.png'), (await win.webContents.capturePage()).toPNG())
  check('bubble-only native hit regions contain only the visible bubble', regions.get(win.webContents.id).length === 1, regions.get(win.webContents.id))

  current.phase = 'tool'; current.animation = 'running'; current.bubble = '等待 pwsh-8 响应'
  current.sessions = [{ sessionId: 'fixture', phase: 'tool', animation: 'running', bubble: current.bubble, whisper: '不应覆盖任务状态' }]
  win = await refresh()
  bubble = await inspectBubble()
  check('bubble-only preserves the actual shell-wait status', bubble.text === current.bubble && bubble.images === 0, bubble)
  writeFileSync(join(output, 'bubble-only-task.png'), (await win.webContents.capturePage()).toPNG())
  x = Math.round(bubble.left + bubble.width / 2); y = Math.round(bubble.top + bubble.height / 2)
  await click(win, x, y, 'left')
  check('clicking the task bubble opens its DSH session', report.opens.length === 2 && report.opens[1] === 'fixture', { opens: [...report.opens] })
  const before = win.getBounds(), opensBeforeDrag = report.opens.length
  cursor = { x: before.x + x, y: before.y + y }
  win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 })
  await pause(40)
  cursor = { x: cursor.x + 30, y: cursor.y + 20 }
  await win.webContents.executeJavaScript(`document.querySelector('[data-pet-status-entry]').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,screenX:30,screenY:20}))`)
  await pause(40)
  const after = win.getBounds()
  check('bubble drag moves the real native window by the held-pointer delta', after.x === before.x + 30 && after.y === before.y + 20, { before, after })
  win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 })
  await win.webContents.executeJavaScript(`document.querySelector('[data-pet-status-entry]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`)
  await pause(70)
  check('releasing a bubble drag does not open DSH', report.opens.length === opensBeforeDrag)
  await click(win, x, y, 'right')
  check('right click retains the care panel in bubble-only mode', report.interactions === 2 && await win.webContents.executeJavaScript("!!document.querySelector('[data-pet-care-panel]')"))
  current = state('whale-girl-refined')
  win = await refresh()
  check('turning bubble-only off restores the pet renderer', await win.webContents.executeJavaScript("!!document.querySelector('[data-dsh-pet-animation]') && !document.querySelector('[data-dsh-pet-display=\"bubble-only\"]')"))
  check('sandbox renderer reports no script errors', report.errors.length === 0, report.errors)
  report.success = true
}).catch(error => { report.success = false; report.error = error.stack }).finally(() => {
  if (originalCursor) screen.getCursorScreenPoint = originalCursor
  writeFileSync(join(output, 'native-results.json'), JSON.stringify(report, null, 2))
  unlinkSync(fixture)
  app.quit()
})
