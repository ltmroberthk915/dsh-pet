import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { runInNewContext } from 'node:vm'
import { join } from 'node:path'
import * as layout from '../desktop/pet-layout.js'

let app: any, screen: any, ipc: any, controller: any, state: any
let windows: any[], cursor: { x: number; y: number }, scale: number
const tick = (ms = 0) => vi.advanceTimersByTimeAsync(ms)
const currentWindow = () => windows.at(-1)
function drag(win: any, phase: string) {
  ipc.emit('dsh-pet-v1:drag', { sender: win.webContents, senderFrame: win.webContents.mainFrame }, phase)
}

beforeEach(() => {
  vi.useFakeTimers()
  windows = []; cursor = { x: 800, y: 600 }; scale = 2
  app = Object.assign(new EventEmitter(), { getPath: () => 'fixture' })
  screen = Object.assign(new EventEmitter(), {
    getCursorScreenPoint: vi.fn(() => ({ ...cursor })),
    getAllDisplays: () => [{ id: 1, scaleFactor: scale, bounds: { x: 0, y: 0, width: 2000, height: 1200 } }],
    getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 2000, height: 1160 } }),
    getDisplayNearestPoint: () => screen.getAllDisplays()[0],
  })
  ipc = Object.assign(new EventEmitter(), { handle: vi.fn() })
  class Window extends EventEmitter {
    destroyed = false; visible = false; bounds: any; webContents: any; dpi = scale
    getBounds = vi.fn(() => ({ ...this.bounds }))
    setPosition = vi.fn((x, y) => {
      const drift = Number.isInteger(this.dpi) ? 0 : 1
      this.bounds = { ...this.bounds, x, y, width: this.bounds.width + drift, height: this.bounds.height + drift }
      this.emit('move')
    })
    setBounds = vi.fn(bounds => { this.bounds = { ...bounds }; this.emit('move') })
    setIgnoreMouseEvents = vi.fn()
    constructor(options: any) {
      super()
      this.bounds = { x: options.x, y: options.y, width: options.width, height: options.height }
      this.webContents = Object.assign(new EventEmitter(), {
        mainFrame: { url: 'dsh-app://pet/index.html' }, send: vi.fn(), setWindowOpenHandler: vi.fn(),
      })
      windows.push(this)
    }
    isDestroyed() { return this.destroyed }
    isVisible() { return this.visible }
    isAlwaysOnTop() { return true }
    setAlwaysOnTop() {}
    hookWindowMessage() {}
    moveTop() {}
    showInactive() { this.visible = true }
    async loadURL() {}
    destroy() { this.destroyed = true; this.emit('closed') }
  }
  const petSession = { setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, on() {}, protocol: { handle() {} } }
  const source = readFileSync(new URL('../desktop/pet-main.js', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace("fileURLToPath(new URL('.', import.meta.url))", "'fixture'")
    .replace('export function installDesktopPet', 'globalThis.installDesktopPet = function')
  const context: any = { ...layout, app, screen, ipcMain: ipc, BrowserWindow: Window,
    session: { fromPartition: () => petSession }, join, URL, Date, JSON,
    setTimeout, clearTimeout, setInterval, clearInterval,
    process: { platform: 'win32' },
    readFile: async () => { throw Error('no saved position') }, writeFile: async () => {}, rename: async () => {},
  }
  runInNewContext(source, context)
  state = { pet: { id: 'miku' }, display: { size: 160, bubbleScale: 1, visible: true, desktopEnabled: true } }
  controller = context.installDesktopPet({ owner: () => undefined, openMain() {}, request: async (path: string) => ({
    ok: true, json: async () => path === '/api/pet/pets' ? [{ id: 'miku', cell: { width: 192, height: 208 } }] : state,
  }) })
})
afterEach(async () => { app.emit('before-quit'); await tick(); vi.useRealTimers() })

describe('native pet coordinates and idle sampling', () => {
  it('keeps one screen anchor through repeated moves and flushes the final throttled movement', async () => {
    scale = 1.75
    await controller.configure({ enabled: true })
    const win = currentWindow(), before = win.getBounds()
    drag(win, 'start')
    for (let i = 1; i <= 20; i++) {
      cursor = { x: 800 + i * 5, y: 600 - i * 3 }
      await tick(8); drag(win, 'move')
      expect(win.getBounds()).toEqual({ ...before, x: before.x + i * 5, y: before.y - i * 3 })
    }
    const moves = win.setBounds.mock.calls.length
    await tick(8); drag(win, 'move')
    expect(win.setBounds).toHaveBeenCalledTimes(moves)
    cursor = { x: 950, y: 520 }
    drag(win, 'move'); drag(win, 'end')
    expect(win.getBounds()).toMatchObject({ x: before.x + 150, y: before.y - 80 })
    expect(win.getBounds()).toMatchObject({ width: before.width, height: before.height })
  })

  it('recreates the native surface after 200% to 175% and discards the old captured pointer', async () => {
    await controller.configure({ enabled: true })
    const old = currentWindow(), before = old.getBounds()
    drag(old, 'start')
    scale = 1.75
    screen.emit('display-metrics-changed', {}, screen.getAllDisplays()[0], ['bounds', 'scaleFactor'])
    await tick()
    const win = currentWindow()
    expect(old.isDestroyed()).toBe(true)
    expect(win).not.toBe(old)
    expect(win.dpi).toBe(1.75)
    expect(win.getBounds()).toEqual(before)
    const held = win.getBounds()
    cursor = { x: 1000, y: 700 }
    drag(win, 'move')
    expect(win.getBounds()).toEqual(held)
    drag(win, 'start')
    cursor = { x: 1014, y: 707 }
    await tick(8); drag(win, 'move'); drag(win, 'end')
    expect(win.getBounds()).toMatchObject({ x: held.x + 14, y: held.y + 7 })
    screen.emit('display-metrics-changed', {}, screen.getAllDisplays()[0], ['workArea'])
    await tick()
    expect(currentWindow()).toBe(win)
  })

  it('samples one cursor for multiple pets and skips native bounds reads while stationary', async () => {
    state.display.multiPetEnabled = true
    state.companions = ['a', 'b', 'c'].map((id, i) => ({ sessionId: id, primary: i === 0 }))
    await controller.configure({ enabled: true })
    await tick(50)
    screen.getCursorScreenPoint.mockClear()
    for (const win of windows) win.getBounds.mockClear()
    await tick(500)
    expect(screen.getCursorScreenPoint).toHaveBeenCalledTimes(10)
    for (const win of windows) expect(win.getBounds).not.toHaveBeenCalled()
  })
})
