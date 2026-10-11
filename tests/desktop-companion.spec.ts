import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import { runInNewContext } from 'node:vm'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
let controller: any
let children: any[]
let handler: any
let prepare: any
let openMain: any
const tick = async (ms = 0) => { await vi.advanceTimersByTimeAsync(ms) }

beforeEach(() => {
  vi.useFakeTimers()
  children = []; openMain = vi.fn(); prepare = vi.fn().mockResolvedValue('C:/fixture/DshPetDesktop.exe')
  const module = { exports: {} as any }
  runInNewContext(readFileSync(new URL('../desktop/companion-host.cjs', import.meta.url), 'utf8'), {
    module, Buffer, Date, URL, setTimeout, clearTimeout, setInterval, clearInterval,
    require: (name: string) => {
      if (name === './archive-support.cjs') return { loadPayload: () => {} }
      if (name === './companion-runtime.cjs') return { nativeDesktopExecutable: () => 'C:/fixture/DeepSeek Harness.exe', childEnvironment: () => ({}) }
      if (name === 'node:http') return { createServer: (fn: any) => {
        handler = fn
        const server = new EventEmitter() as any
        server.listen = (_port: any, _host: any, cb: any) => cb()
        server.address = () => ({ port: 12345 })
        server.closeAllConnections = vi.fn(); server.close = vi.fn()
        return server
      } }
      if (name === 'node:child_process') return { spawn: (_exe: any, _args: any, options: any) => {
        const child = new EventEmitter() as any
        child.exitCode = null; child.stderr = new EventEmitter()
        child.bootstrap = JSON.parse(options.env.DSH_PET_BOOTSTRAP)
        child.unref = vi.fn()
        child.exit = (code = 1) => { child.exitCode = code; child.emit('exit', code) }
        child.kill = vi.fn(() => child.exit())
        children.push(child)
        return child
      } }
      return require(name)
    },
  })
  controller = module.exports.createCompanion({ pluginDir: fileURLToPath(new URL('..', import.meta.url)), cacheDir: 'C:/fixture/cache',
    enabled: () => true, routes: () => [], prepareRuntime: prepare, openMain })
})
afterEach(async () => { controller?.dispose(); await tick(3000); vi.useRealTimers() })

async function event(body: any) {
  const req = new EventEmitter() as any
  req.method = 'POST'; req.url = '/event'
  req.headers = { authorization: 'Bearer ' + children.at(-1).bootstrap.token }
  req[Symbol.asyncIterator] = async function* () { yield Buffer.from(JSON.stringify(body)) }
  const res = { headersSent: false, writeHead: vi.fn(), end: vi.fn() }
  handler(req, res); await tick()
  expect(res.writeHead).toHaveBeenCalledWith(200, expect.anything())
}
async function start() { controller.configure({ enabled: true }); await tick(); expect(children).toHaveLength(1) }

describe('independent pet automatic recovery', () => {
  it('retries a preparation failure automatically and retains manual retry', async () => {
    prepare.mockRejectedValueOnce(Object.assign(new Error('disk full'), { code: 'ENOSPC' }))
    controller.configure({ enabled: true }); await tick()
    expect(controller.status().message).toContain('磁盘空间不足')
    expect(children).toHaveLength(0)
    await tick(1000); expect(children).toHaveLength(1)
    children[0].exit(); await tick()
    controller.retry(); await tick()
    expect(children).toHaveLength(2)
  })
  it('backs off repeated crashes and never overlaps an old single-instance process', async () => {
    await start()
    children[0].exit(); await tick(999); expect(children).toHaveLength(1)
    await tick(1); expect(children).toHaveLength(2)
    children[1].exit(); await tick(1999); expect(children).toHaveLength(2)
    await tick(1); expect(children).toHaveLength(3)
    await tick(20000) // startup timeout, process is still alive
    expect(controller.status().state).toBe('error')
    controller.retry(); await tick(2999); expect(children).toHaveLength(3)
    await tick(1); expect(children[2].kill).toHaveBeenCalledOnce()
    expect(children).toHaveLength(4)
  })
  it('detects a silent companion after a successful heartbeat and recovers', async () => {
    await start(); await event({ type: 'status', active: true, version: controller.status().version })
    expect(controller.status().active).toBe(true)
    await tick(22000); expect(controller.status().state).toBe('error')
    await tick(3000); expect(children).toHaveLength(2)
  })
  it('cancels pending recovery when disabled or disposed, and can re-enable', async () => {
    await start(); children[0].exit()
    controller.configure({ enabled: false }); await tick(40000)
    expect(children).toHaveLength(1)
    controller.configure({ enabled: true }); await tick(1000)
    expect(children).toHaveLength(2)
    children[1].exit(); controller.dispose(); await tick(40000)
    expect(children).toHaveLength(2)
  })
  it('keeps session delivery while a direct foreground activation is in flight', async () => {
    await start()
    await event({ type: 'open', sessionId: 'first', activated: true })
    await event({ type: 'open', sessionId: 'second', activated: true })
    expect(controller.status().pendingOpen.sessionId).toBe('second')
    expect(openMain).toHaveBeenCalledOnce()
    const revision = controller.status().pendingOpen.revision
    controller.acknowledge(revision - 1); expect(controller.status().pendingOpen).toBeDefined()
    controller.acknowledge(revision); expect(controller.status().pendingOpen).toBeUndefined()
    expect(children[0].bootstrap.appExecutable).toBe('C:/fixture/DeepSeek Harness.exe')
  })
})
