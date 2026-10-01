import { app, BrowserWindow, ipcMain, screen, session } from 'electron'
import { readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PAGE = 'dsh-app://pet/index.html'
const DIR = fileURLToPath(new URL('.', import.meta.url))
const PREFIX = 'dsh-pet-v1:'
const WIDTH = 420, HEIGHT = 460, SECONDARY_SCALE = 0.62
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'"
const ACTIONS = {
  state: ['GET', '/api/pet/state'], pets: ['GET', '/api/pet/pets'],
  rename: ['POST', '/api/pet/set-name'],
  pet: ['POST', '/api/pet/interact', { kind: 'pet' }], feed: ['POST', '/api/pet/interact', { kind: 'feed' }],
  hide: ['POST', '/api/pet/set-visible', { visible: false }], show: ['POST', '/api/pet/set-visible', { visible: true }],
  touch: ['POST', '/api/pet/gameplay/touch'], skin: ['POST', '/api/pet/set-skin'],
  mode: ['POST', '/api/pet/gameplay/mode'], 'work-tick': ['POST', '/api/pet/gameplay/work-tick'], buy: ['POST', '/api/pet/gameplay/buy'],
}

/** One bounded host poll feeds all independently draggable, sandboxed pets. */
export function installDesktopPet({ owner, request, openMain }) {
  const windows = new Map()
  let enabled = false, closing = false, currentSessionId, revision = 0
  let stateFlight, reconcileFlight, cache, cacheAt = 0, pollTimer, saveTimer, savedBounds
  let petDefinitions = [], definitionsFlight
  const positionFile = join(app.getPath('userData'), 'dsh-pet-window.json')
  const petSession = session.fromPartition('dsh-pet-v1')
  petSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  petSession.setPermissionCheckHandler(() => false)
  petSession.on('will-download', event => event.preventDefault())
  const live = record => record && !record.win.isDestroyed()
  const primary = () => [...windows.values()].find(r => live(r) && r.view.primary && !r.retiring)
  function assertOwner(event) {
    const main = owner()
    if (!main || event.sender !== main.webContents || event.senderFrame !== main.webContents.mainFrame) throw new Error('Unowned pet request')
    const url = new URL(event.senderFrame.url)
    if (url.protocol !== 'dsh-app:' || url.hostname !== 'app') throw new Error('Invalid pet owner origin')
  }
  function assertPet(event) {
    const record = [...windows.values()].find(r => live(r) && r.win.webContents === event.sender)
    if (!record || event.senderFrame !== record.win.webContents.mainFrame || event.senderFrame.url !== PAGE) throw new Error('Unowned pet frame')
    return record
  }
  function measure(view) {
    const size = Number.isFinite(view.display?.size) ? Math.max(20, Math.min(1024, view.display.size)) : 160
    const pet = petDefinitions.find(p => p.id === view.pet?.id)
    const ratio = pet?.cell?.width / pet?.cell?.height
    const width = size * (Number.isFinite(ratio) && ratio > 0 ? Math.min(8, ratio) : 1)
    const secondary = view.primary === false
    return { artwork: { width, height: size }, dimensions: {
      width: Math.max(secondary ? 300 : WIDTH, Math.ceil(width + 80)),
      height: Math.max(secondary ? 300 : HEIGHT, Math.ceil(size + (secondary ? 170 : 220))),
    } }
  }
  function fit(bounds, geometry) {
    const { dimensions, artwork } = geometry
    const left = (dimensions.width - artwork.width) / 2, top = dimensions.height - 135 - artwork.height
    const rect = { x: bounds.x + left, y: bounds.y + top, ...artwork }
    const visible = screen.getAllDisplays().some(({ bounds: area }) =>
      Math.min(rect.x + rect.width, area.x + area.width) - Math.max(rect.x, area.x) >= 16
      && Math.min(rect.y + rect.height, area.y + area.height) - Math.max(rect.y, area.y) >= 16)
    if (visible) return { x: Math.round(bounds.x), y: Math.round(bounds.y), ...dimensions }
    const area = screen.getDisplayNearestPoint({ x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }).bounds
    return { x: Math.round(Math.min(area.x + area.width - left - 16, Math.max(area.x - left - artwork.width + 16, bounds.x))),
      y: Math.round(Math.min(area.y + area.height - top - 16, Math.max(area.y - top - artwork.height + 16, bounds.y))), ...dimensions }
  }
  function defaultBounds(geometry) {
    const area = screen.getPrimaryDisplay().workArea
    return fit({ x: area.x + area.width - geometry.dimensions.width - 20, y: area.y + area.height - geometry.dimensions.height }, geometry)
  }
  async function readPosition() {
    if (savedBounds) return savedBounds
    try {
      const value = JSON.parse(await readFile(positionFile, 'utf8'))
      if (Number.isFinite(value.x) && Number.isFinite(value.y)) savedBounds = value
    } catch {}
    return savedBounds
  }
  function savePosition(record) {
    if (!live(record) || !record.view.primary || record.retiring) return
    savedBounds = record.win.getBounds()
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const data = JSON.stringify(savedBounds)
      void writeFile(positionFile + '.tmp', data, { mode: 0o600 }).then(() => rename(positionFile + '.tmp', positionFile)).catch(() => {})
    }, 250)
  }
  async function api(action, body) {
    if (!Object.hasOwn(ACTIONS, action)) throw new Error('Unknown pet action')
    const [method, base, fixed] = ACTIONS[action]
    const path = action === 'state' ? base + '?current=' + encodeURIComponent(currentSessionId ?? '') : base
    const payload = fixed ?? body ?? {}
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload) || JSON.stringify(payload).length > 4096) throw new Error('Invalid pet payload')
    const result = await request(path, method, method === 'GET' ? undefined : payload)
    if (!result.ok) throw new Error('Pet service unavailable: ' + result.status)
    return result.json()
  }
  async function definitions() {
    if (petDefinitions.length) return petDefinitions
    if (!definitionsFlight) definitionsFlight = api('pets').then(data => { if (Array.isArray(data)) petDefinitions = data; return petDefinitions }).finally(() => { definitionsFlight = undefined })
    return definitionsFlight
  }
  function desiredViews(state) {
    const { companions, ...common } = state
    if (!state.display?.multiPetEnabled || !companions?.length) return [{ ...common, key: 'single', primary: true, color: { palette: 'ds' } }]
    return companions.map(c => ({ ...common, ...c, key: 'session:' + c.sessionId,
      bubble: c.bubble, performance: c.performance,
      sessions: c.bubble ? [{ sessionId: c.sessionId, animation: c.animation, phase: c.phase, bubble: c.bubble, whisper: c.whisper }] : [],
      announcement: c.primary ? state.announcement : undefined,
      display: { ...state.display, size: Math.max(20, Math.round(state.display.size * (c.primary ? 1 : SECONDARY_SCALE))) } }))
  }
  function destroyAll() {
    clearTimeout(pollTimer)
    for (const record of windows.values()) { clearInterval(record.returnTimer); if (live(record)) record.win.destroy() }
    windows.clear()
  }
  function publish(record) {
    const serialized = JSON.stringify(record.view)
    if (serialized === record.lastSent) return
    record.lastSent = serialized
    record.win.webContents.send(PREFIX + 'update', record.view)
  }
  function retire(record, destination) {
    if (!live(record) || record.retiring) return
    if (!live(destination) || record.view.primary || !cache?.display.multiPetEnabled) { record.win.destroy(); return }
    record.retiring = true
    record.win.setIgnoreMouseEvents(true, { forward: true })
    record.win.webContents.send(PREFIX + 'retire')
    const from = record.win.getBounds(), target = destination.win.getBounds(), start = Date.now()
    // Brief, event-driven return flight. There is no permanent motion timer.
    record.returnTimer = setInterval(() => {
      if (!live(record)) { clearInterval(record.returnTimer); return }
      const t = Math.min(1, (Date.now() - start) / 280), ease = 1 - (1 - t) ** 3
      record.win.setPosition(Math.round(from.x + (target.x + (target.width - from.width) / 2 - from.x) * ease),
        Math.round(from.y + (target.y + target.height - from.height - from.y) * ease))
      if (t === 1) { clearInterval(record.returnTimer); record.win.destroy() }
    }, 25)
  }
  async function create(view, anchor, index) {
    const geometry = measure(view)
    const saved = view.primary ? await readPosition() : undefined
    if (!enabled || closing) return
    const base = anchor ?? saved ?? defaultBounds(geometry)
    const spacing = Math.max(90, geometry.artwork.width + 18)
    const area = screen.getDisplayNearestPoint({ x: Math.round(base.x + WIDTH / 2), y: Math.round(base.y + HEIGHT / 2) }).bounds
    const centerX = base.x + (base.width ?? WIDTH) / 2
    const direction = centerX < area.x + area.width / 2 ? 1 : -1
    const available = direction === 1 ? area.x + area.width - centerX : centerX - area.x
    const columns = Math.max(1, Math.floor((available - geometry.artwork.width / 2 - 8) / spacing))
    const offset = Math.max(1, index)
    let x = base.x + ((base.width ?? WIDTH) - geometry.dimensions.width) / 2
    let y = base.y + (base.height ?? HEIGHT) - geometry.dimensions.height
    if (!view.primary) {
      x += direction * (((offset - 1) % columns) + 1) * spacing
      y -= Math.floor((offset - 1) / columns) * (geometry.artwork.height + 24)
      const left = (geometry.dimensions.width - geometry.artwork.width) / 2
      const top = geometry.dimensions.height - 135 - geometry.artwork.height
      // New companions start wholly visible; later user drags remain free.
      x = Math.min(area.x + area.width - left - geometry.artwork.width - 4, Math.max(area.x - left + 4, x))
      y = Math.min(area.y + area.height - top - geometry.artwork.height - 4, Math.max(area.y - top + 4, y))
    }
    const bounds = fit({ x, y }, geometry)
    const win = new BrowserWindow({ ...bounds, title: 'DSH Pet', frame: false, transparent: true, backgroundColor: '#00000000',
      alwaysOnTop: true, skipTaskbar: true, resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
      hasShadow: false, show: false, autoHideMenuBar: true,
      webPreferences: { preload: join(DIR, 'pet-preload.cjs'), session: petSession, nodeIntegration: false, contextIsolation: true,
        sandbox: true, webSecurity: true, backgroundThrottling: false, spellcheck: false, devTools: false } })
    const record = { win, view, geometry, lastInteractive: false, lastMove: 0 }
    windows.set(view.key, record)
    win.setIgnoreMouseEvents(true, { forward: true })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', (event, url) => { if (url !== PAGE) event.preventDefault() })
    win.webContents.on('will-redirect', event => event.preventDefault())
    win.webContents.on('will-attach-webview', event => event.preventDefault())
    win.on('closed', () => { clearInterval(record.returnTimer); if (windows.get(view.key) === record) windows.delete(view.key) })
    win.on('move', () => savePosition(record))
    try {
      await win.loadURL(PAGE)
      if (live(record) && enabled && !closing) {
        win.showInactive(); win.setAlwaysOnTop(true)
        publish(record)
        setTimeout(() => { if (live(record)) win.setAlwaysOnTop(true) }, 250)
      }
    } catch (error) { if (live(record)) win.destroy(); throw error }
    return record
  }
  async function reconcile(state) {
    if (!enabled || closing) return
    if (state.display?.visible === false || state.display?.desktopEnabled === false) { enabled = false; revision++; destroyAll(); return }
    const token = revision, views = desiredViews(state), wanted = new Set(views.map(v => v.key))
    const oldPrimary = primary(), anchor = live(oldPrimary) ? oldPrimary.win.getBounds() : savedBounds
    let index = 0
    for (const view of [...views].sort((a, b) => Number(b.primary) - Number(a.primary))) {
      if (token !== revision || !enabled || closing) return
      const viewIndex = index++
      let record = windows.get(view.key)
      if (record?.retiring) { clearInterval(record.returnTimer); record.win.destroy(); record = undefined }
      if (!live(record)) { await create(view, anchor, viewIndex); continue }
      const previous = record.geometry, geometry = measure(view), bounds = record.win.getBounds()
      record.view = view; record.geometry = geometry
      if (previous.dimensions.width !== geometry.dimensions.width || previous.dimensions.height !== geometry.dimensions.height) {
        record.win.setBounds(fit({ x: bounds.x + (previous.dimensions.width - geometry.dimensions.width) / 2,
          y: bounds.y + previous.dimensions.height - geometry.dimensions.height }, geometry))
      }
      if (record.win.isVisible() && !record.win.isAlwaysOnTop()) record.win.setAlwaysOnTop(true)
      publish(record)
    }
    const destination = primary()
    for (const [key, record] of windows) if (!wanted.has(key)) retire(record, destination)
  }
  async function fetchState(force = false) {
    if (!force && cache && Date.now() - cacheAt < 850) return cache
    if (stateFlight) { await stateFlight; return fetchState() }
    const token = revision
    stateFlight = api('state').then(async state => {
      if (token !== revision) return undefined
      cache = state; cacheAt = Date.now()
      if (enabled) {
        await definitions()
        if (reconcileFlight) await reconcileFlight
        if (token === revision) {
          reconcileFlight = reconcile(state)
          try { await reconcileFlight } finally { reconcileFlight = undefined }
        }
      }
      return state
    }).finally(() => { stateFlight = undefined })
    const result = await stateFlight
    return result ?? fetchState(true)
  }
  function poll() {
    clearTimeout(pollTimer)
    if (!enabled || closing) return
    void fetchState().catch(() => {
      for (const record of windows.values()) if (live(record)) {
        record.lastSent = undefined
        record.win.webContents.send(PREFIX + 'disconnected')
      }
    }).finally(() => { if (enabled && !closing) pollTimer = setTimeout(poll, 1000) })
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
  ipcMain.handle(PREFIX + 'configure', async (event, options) => {
    assertOwner(event)
    if (!options || typeof options.enabled !== 'boolean' || (options.currentSessionId !== undefined && (typeof options.currentSessionId !== 'string' || options.currentSessionId.length > 200))) throw new Error('Invalid pet configuration')
    if (enabled !== options.enabled || currentSessionId !== options.currentSessionId) { revision++; cacheAt = 0 }
    enabled = options.enabled; currentSessionId = options.currentSessionId
    if (!enabled) destroyAll()
    else { await fetchState(true); poll() }
    return { active: enabled && [...windows.values()].some(live) }
  })
  ipcMain.handle(PREFIX + 'call', async (event, action, body) => {
    const record = assertPet(event)
    if (action === 'state') return record.view
    if (action === 'pets') return definitions()
    const result = await api(action, body)
    cacheAt = 0
    if (action === 'hide') { enabled = false; revision++; setTimeout(destroyAll, 50); openMain() }
    else poll()
    return result
  })
  ipcMain.on(PREFIX + 'interactive', (event, interactive) => {
    try {
      const record = assertPet(event)
      if (typeof interactive !== 'boolean' || record.drag || record.retiring || record.lastInteractive === interactive) return
      record.lastInteractive = interactive; record.win.setIgnoreMouseEvents(!interactive, { forward: true })
    } catch {}
  })
  ipcMain.on(PREFIX + 'drag', (event, phase) => {
    try {
      const record = assertPet(event), win = record.win
      if (record.retiring) return
      if (phase === 'start') { record.drag = { cursor: screen.getCursorScreenPoint(), bounds: win.getBounds() }; win.setIgnoreMouseEvents(false); return }
      if (phase === 'end') { record.drag = undefined; savePosition(record); return }
      if (phase !== 'move' || !record.drag || Date.now() - record.lastMove < 8) return
      record.lastMove = Date.now()
      const cursor = screen.getCursorScreenPoint(), drag = record.drag
      win.setPosition(Math.round(drag.bounds.x + cursor.x - drag.cursor.x), Math.round(drag.bounds.y + cursor.y - drag.cursor.y))
    } catch {}
  })
  ipcMain.handle(PREFIX + 'open-main', (event, id) => {
    const record = assertPet(event)
    if (id !== undefined && (typeof id !== 'string' || id.length > 200 || (id !== record.view.sessionId && !record.view.sessions?.some(s => s.sessionId === id)))) throw new Error('Invalid session')
    openMain()
    if (id) owner()?.webContents.send(PREFIX + 'open-session', id)
  })
  ipcMain.handle(PREFIX + 'owner-state', (event, id) => {
    assertOwner(event)
    if (id !== undefined) {
      if (typeof id !== 'string' || id.length > 200) throw new Error('Invalid session')
      if ((currentSessionId ?? '') !== id) { currentSessionId = id || undefined; revision++; cacheAt = 0 }
    }
    return fetchState()
  })
  ipcMain.handle(PREFIX + 'owner-reset', event => {
    assertOwner(event)
    const record = primary()
    if (!live(record)) return { active: false }
    const anchor = defaultBounds(record.geometry)
    record.win.setBounds(anchor); savePosition(record)
    let n = 0
    for (const other of windows.values()) if (live(other) && other !== record) {
      other.win.setBounds(fit({ x: anchor.x - (++n) * (other.geometry.artwork.width + 22), y: anchor.y }, other.geometry))
    }
    return { active: true }
  })
  const refit = () => { for (const record of windows.values()) if (live(record)) record.win.setBounds(fit(record.win.getBounds(), record.geometry)) }
  screen.on('display-removed', refit); screen.on('display-metrics-changed', refit)
  app.on('before-quit', () => { closing = true; enabled = false; revision++; clearTimeout(saveTimer); destroyAll() })
}
