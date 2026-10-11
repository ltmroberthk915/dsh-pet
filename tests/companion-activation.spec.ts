import { afterEach, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { runInNewContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
afterEach(() => vi.useRealTimers())

it('activates directly from the pet process, coalesces double clicks, and keeps the latest session on failure', async () => {
  vi.useFakeTimers()
  let bridge: any
  const events: any[] = []
  const app = Object.assign(new EventEmitter(), { setName: vi.fn(), setPath: vi.fn(), requestSingleInstanceLock: () => true, whenReady: async () => {}, quit: vi.fn() })
  const children: any[] = []
  const spawn = vi.fn(() => {
    const child = Object.assign(new EventEmitter(), { unref: vi.fn() }); children.push(child); return child
  })
  const module = { exports: {} as any }
  const source = readFileSync(new URL('../desktop/companion-main.cjs', import.meta.url), 'utf8')
  const seam = "await import(pathToFileURL(join(__dirname, 'pet-main.js')))"
  expect(source).toContain(seam)
  // Replace only Electron's window installation dependency. Exercise the
  // production activation callback and control/report code unchanged.
  runInNewContext(source.replace(seam, '({ installDesktopPet: globalThis.installDesktopPet })'), {
    module, exports: module.exports, __dirname: fileURLToPath(new URL('../desktop/', import.meta.url)), AbortSignal, setTimeout, clearTimeout,
    installDesktopPet: (options: any) => { bridge = options; return { configure: async () => {}, resetPosition: () => {}, isActive: () => false } },
    fetch: async (url: string, options: any) => {
      if (url.endsWith('/event')) events.push(JSON.parse(options.body))
      return { ok: true, json: async () => ({ options: { enabled: false }, resetRevision: 0 }) }
    },
    require: (name: string) => name === 'electron' ? { app }
      : name === 'node:fs' ? { mkdirSync: () => {} }
      : name === 'node:child_process' ? { spawn }
      : name === './companion-runtime.cjs' ? { childEnvironment: () => ({ SystemRoot: 'C:/Windows' }) } : require(name),
  })
  const appExecutable = resolve('fixture', 'DeepSeek Harness.exe')
  await module.exports.start({ port: 12345, token: 'a'.repeat(64), dataDir: resolve('fixture', 'data'), version: '1.4.1', appExecutable })
  bridge.openMain('first'); bridge.openMain('second')
  await vi.advanceTimersByTimeAsync(0)
  expect(spawn).toHaveBeenCalledOnce()
  expect(spawn).toHaveBeenCalledWith(appExecutable, [], expect.objectContaining({ windowsHide: true, stdio: 'ignore', env: { SystemRoot: 'C:/Windows' } }))
  expect(events.filter(event => event.type === 'open')).toEqual([
    { type: 'open', sessionId: 'first', activated: true }, { type: 'open', sessionId: 'second', activated: true },
  ])
  children[0].emit('error', new Error('launcher unavailable'))
  await vi.advanceTimersByTimeAsync(0)
  expect(events.at(-1)).toEqual({ type: 'open', sessionId: 'second' })
  expect(app.quit).not.toHaveBeenCalled()
  bridge.openMain('third'); expect(spawn).toHaveBeenCalledTimes(2)
  children[1].emit('exit', 0)
  bridge.openMain('fourth'); expect(spawn).toHaveBeenCalledTimes(3)
  app.emit('before-quit')
})
