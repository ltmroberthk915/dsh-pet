import { app, BrowserWindow, ipcMain, screen, session } from 'electron'
import { readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PAGE = 'dsh-app://pet/index.html'
const DIR = fileURLToPath(new URL('.', import.meta.url))
const PREFIX = 'dsh-pet-v1:'
const WIDTH = 420, HEIGHT = 460
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'"
const ACTIONS = {
  state: ['GET', '/api/pet/state'], pets: ['GET', '/api/pet/pets'],
  rename: ['POST', '/api/pet/set-name'],
  pet: ['POST', '/api/pet/interact', { kind: 'pet' }], feed: ['POST', '/api/pet/interact', { kind: 'feed' }],
  hide: ['POST', '/api/pet/set-visible', { visible: false }], show: ['POST', '/api/pet/set-visible', { visible: true }],
  touch: ['POST', '/api/pet/gameplay/touch'], skin: ['POST', '/api/pet/set-skin'],
  mode: ['POST', '/api/pet/gameplay/mode'], 'work-tick': ['POST', '/api/pet/gameplay/work-tick'], buy: ['POST', '/api/pet/gameplay/buy'],
}

/** Called by the existing shell with a captured, authenticated host transport. */
export function installDesktopPet({ owner, request, openMain }) {
  let petWindow, creating, enabled = false, closing = false, currentSessionId, drag
  let saveTimer, lastMove = 0, lastInteractive, petDefinitions = []
  let dimensions = { width: WIDTH, height: HEIGHT }
  let artwork = { width: 160, height: 160 }
  const positionFile = join(app.getPath('userData'), 'dsh-pet-window.json')
  const petSession = session.fromPartition('dsh-pet-v1')
  petSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  petSession.setPermissionCheckHandler(() => false)
  petSession.on('will-download', event => event.preventDefault())
  const live = () => petWindow && !petWindow.isDestroyed() ? petWindow : undefined
  function assertOwner(event) {
    const main = owner()
    if (!main || event.sender !== main.webContents || event.senderFrame !== main.webContents.mainFrame) throw new Error('Unowned pet request')
    const url = new URL(event.senderFrame.url)
    if (url.protocol !== 'dsh-app:' || url.hostname !== 'app') throw new Error('Invalid pet owner origin')
  }
  function assertPet(event) {
    const win = live()
    if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame || event.senderFrame.url !== PAGE) throw new Error('Unowned pet frame')
    return win
  }
  function fit(bounds) {
    const left = (dimensions.width - artwork.width) / 2
    const top = dimensions.height - 135 - artwork.height
    const rect = { x: bounds.x + left, y: bounds.y + top, ...artwork }
    const visible = screen.getAllDisplays().some(({ bounds: area }) =>
      Math.min(rect.x + rect.width, area.x + area.width) - Math.max(rect.x, area.x) >= 16
      && Math.min(rect.y + rect.height, area.y + area.height) - Math.max(rect.y, area.y) >= 16)
    // Transparent window padding may extend beyond any display. Recover only
    // artwork that became unreachable after restart or a monitor change.
    if (visible) return { x: Math.round(bounds.x), y: Math.round(bounds.y), ...dimensions }
    const area = screen.getDisplayNearestPoint({ x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }).bounds
    return { x: Math.round(Math.min(area.x + area.width - left - 16, Math.max(area.x - left - artwork.width + 16, bounds.x))),
      y: Math.round(Math.min(area.y + area.height - top - 16, Math.max(area.y - top - artwork.height + 16, bounds.y))), ...dimensions }
  }
  function defaultBounds() {
    const area = screen.getPrimaryDisplay().workArea
    return fit({ x: area.x + area.width - dimensions.width - 20, y: area.y + area.height - dimensions.height, ...dimensions })
  }
  function resizeForState(state) {
    const size = state.display?.size
    if (!Number.isFinite(size) || size < 32 || size > 1024) return
    const pet = petDefinitions.find(p => p.id === state.pet?.id)
    const ratio = pet?.cell?.width / pet?.cell?.height
    const width = size * (Number.isFinite(ratio) && ratio > 0 ? Math.min(8, ratio) : 1)
    artwork = { width, height: size }
    const next = { width: Math.max(WIDTH, Math.ceil(width + 80)), height: Math.max(HEIGHT, Math.ceil(size + 220)) }
    if (next.width === dimensions.width && next.height === dimensions.height) return
    const previous = dimensions
    dimensions = next
    const win = live()
    if (win) {
      const bounds = win.getBounds()
      // Keep the pet's feet and horizontal center in place as its size changes.
      win.setBounds(fit({ ...bounds, x: bounds.x + (previous.width - next.width) / 2, y: bounds.y + previous.height - next.height }))
      saveBounds()
    }
  }
  async function loadBounds() {
    try {
      const value = JSON.parse(await readFile(positionFile, 'utf8'))
      if (Number.isFinite(value.x) && Number.isFinite(value.y)) return fit({ ...defaultBounds(), x: value.x, y: value.y })
    } catch {}
    return defaultBounds()
  }
  function saveBounds() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const win = live()
      if (!win) return
      const data = JSON.stringify(win.getBounds())
      void writeFile(positionFile + '.tmp', data, { mode: 0o600 }).then(() => rename(positionFile + '.tmp', positionFile)).catch(() => {})
    }, 250)
  }
  async function host(action, body) {
    if (!Object.hasOwn(ACTIONS, action)) throw new Error('Unknown pet action')
    const [method, base, fixed] = ACTIONS[action]
    const path = action === 'state' && currentSessionId ? base + '?current=' + encodeURIComponent(currentSessionId) : base
    const payload = fixed ?? body ?? {}
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload) || JSON.stringify(payload).length > 4096) throw new Error('Invalid pet payload')
    const result = await request(path, method, method === 'GET' ? undefined : payload)
    if (!result.ok) throw new Error('Pet service unavailable: ' + result.status)
    const data = await result.json()
    if (action === 'pets' && Array.isArray(data)) petDefinitions = data
    if (action === 'state') {
      resizeForState(data)
      const win = live()
      if (win?.isVisible() && !win.isAlwaysOnTop()) win.setAlwaysOnTop(true)
    }
    return data
  }
  petSession.protocol.handle('dsh-app', async req => {
    const url = new URL(req.url)
    if (url.hostname !== 'pet' || req.method !== 'GET' || url.username || url.password) return new Response(null, { status: 403 })
    const staticFiles = { '/index.html': ['pet-window.html', 'text/html'], '/overlay.js': ['overlay.js', 'application/javascript'], '/overlay.css': ['overlay.css', 'text/css'] }
    if (Object.hasOwn(staticFiles, url.pathname)) {
      const [file, mime] = staticFiles[url.pathname]
      return new Response(await readFile(join(DIR, file)), { headers: { 'content-type': mime + '; charset=utf-8', 'content-security-policy': CSP, 'x-content-type-options': 'nosniff', 'cache-control': 'no-store' } })
    }
    const runtime = ['/api/pet/runtime/live2d-vendor.js', '/api/pet/runtime/live2dcubismcore.min.js']
    if (url.pathname.startsWith('/pet/') || url.pathname.startsWith('/api/pet/decoration/') || runtime.includes(url.pathname)) return request(url.pathname, 'GET')
    return new Response(null, { status: 404 })
  })
  async function show() {
    if (live()) return
    if (creating) return creating
    creating = (async () => {
      const bounds = await loadBounds()
      if (!enabled || closing) return
      const win = new BrowserWindow({ ...bounds, title: 'DSH Pet', frame: false, transparent: true, backgroundColor: '#00000000',
        alwaysOnTop: true, skipTaskbar: true, resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
        hasShadow: false, show: false, autoHideMenuBar: true,
        webPreferences: { preload: join(DIR, 'pet-preload.cjs'), session: petSession, nodeIntegration: false, contextIsolation: true,
          sandbox: true, webSecurity: true, backgroundThrottling: false, spellcheck: false, devTools: false } })
      petWindow = win
      lastInteractive = false
      win.setIgnoreMouseEvents(true, { forward: true })
      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
      win.webContents.on('will-navigate', (event, url) => { if (url !== PAGE) event.preventDefault() })
      win.webContents.on('will-redirect', event => event.preventDefault())
      win.webContents.on('will-attach-webview', event => event.preventDefault())
      win.on('closed', () => { if (petWindow === win) petWindow = undefined; drag = undefined })
      win.on('move', saveBounds)
      await win.loadURL(PAGE)
      if (!win.isDestroyed() && enabled && !closing) {
        win.showInactive(); win.setAlwaysOnTop(true)
        // Windows can apply its startup show flags after the first native show.
        setTimeout(() => { if (!win.isDestroyed()) win.setAlwaysOnTop(true) }, 250)
      }
    })().catch(error => { live()?.destroy(); throw error }).finally(() => { creating = undefined })
    return creating
  }
  ipcMain.handle(PREFIX + 'configure', async (event, options) => {
    assertOwner(event)
    if (!options || typeof options.enabled !== 'boolean' || (options.currentSessionId !== undefined && (typeof options.currentSessionId !== 'string' || options.currentSessionId.length > 200))) throw new Error('Invalid pet configuration')
    enabled = options.enabled
    currentSessionId = options.currentSessionId
    if (enabled) await show()
    else live()?.destroy()
    return { active: enabled && Boolean(live()) }
  })
  ipcMain.handle(PREFIX + 'call', async (event, action, body) => {
    assertPet(event)
    const result = await host(action, body)
    if (action === 'hide'
      || (action === 'state' && (result.display?.visible === false || result.display?.desktopEnabled === false))) {
      enabled = false; setTimeout(() => live()?.destroy(), 100)
    }
    return result
  })
  ipcMain.on(PREFIX + 'interactive', (event, interactive) => {
    try {
      const win = assertPet(event)
      if (typeof interactive !== 'boolean' || drag || lastInteractive === interactive) return
      lastInteractive = interactive
      win.setIgnoreMouseEvents(!interactive, { forward: true })
    } catch {}
  })
  ipcMain.on(PREFIX + 'drag', (event, phase) => {
    try {
      const win = assertPet(event)
      if (phase === 'start') {
        drag = { cursor: screen.getCursorScreenPoint(), bounds: win.getBounds() }
        win.setIgnoreMouseEvents(false); return
      }
      if (phase === 'end') { drag = undefined; saveBounds(); return }
      if (phase !== 'move' || !drag || Date.now() - lastMove < 8) return
      lastMove = Date.now()
      const cursor = screen.getCursorScreenPoint()
      // Follow the cursor without clamping the transparent frame to a work area.
      // This permits edge overlap and seamless movement across monitors.
      win.setPosition(Math.round(drag.bounds.x + cursor.x - drag.cursor.x), Math.round(drag.bounds.y + cursor.y - drag.cursor.y))
    } catch {}
  })
  ipcMain.handle(PREFIX + 'open-main', (event, id) => {
    assertPet(event)
    if (id !== undefined && (typeof id !== 'string' || id.length > 200)) throw new Error('Invalid session')
    openMain()
    if (id) owner()?.webContents.send(PREFIX + 'open-session', id)
  })
  ipcMain.handle(PREFIX + 'owner-state', event => { assertOwner(event); return host('state') })
  ipcMain.handle(PREFIX + 'owner-reset', event => {
    assertOwner(event)
    const win = live()
    if (!win) return { active: false }
    win.setBounds(defaultBounds()); saveBounds()
    return { active: true }
  })
  const refit = () => { const win = live(); if (win) win.setBounds(fit(win.getBounds())) }
  screen.on('display-removed', refit)
  screen.on('display-metrics-changed', refit)
  app.on('before-quit', () => { closing = true; enabled = false; clearTimeout(saveTimer); live()?.destroy() })
}
