import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { createServer } from 'node:http'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { PetService } from './service.ts'
import { makePetRoutes } from './routes.ts'
import type { DesktopCompanion } from './desktop-status.ts'

const ctx = new Context()
const service = new PetService(ctx, { persistDir: mkdtempSync(join(tmpdir(), 'pet-desktop-api-')) })
const status = { supported: true, state: 'ready' as const, active: true, version: '1.2.0' }
const desktop: DesktopCompanion = { status: () => status, configure: vi.fn(value => {
  if (typeof value.enabled !== 'boolean') throw Error('Invalid desktop configuration')
  return status
}), resetPosition: vi.fn(() => status), retry: vi.fn(() => status), acknowledge: vi.fn(() => ({ ok: true as const })), dispose: vi.fn() }
const routes = makePetRoutes({ service, ctx, desktop })
const server = createServer((req, res) => {
  const route = routes.find(route => route.path === new URL(req.url!, 'http://localhost').pathname)
  if (route) void route.handler(req, res)
  else { res.writeHead(404); res.end() }
})
let base = ''
beforeAll(async () => { await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); base = 'http://127.0.0.1:' + (server.address() as { port: number }).port })
afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
const post = (name: string, value: unknown, headers = {}) => fetch(base + '/api/pet/desktop/' + name, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(value) })
it('includes native readiness in the ordinary state response', async () => {
  expect((await (await fetch(base + '/api/pet/state')).json()).desktop).toEqual(status)
})
it('persists bubble-only mode through the real configuration route and rejects non-boolean values', async () => {
  const save = (bubbleOnly: unknown) => fetch(base + '/api/pet/set-config', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bubbleOnly }) })
  const enabled = await save(true)
  expect(enabled.status).toBe(200)
  expect((await enabled.json()).display.bubbleOnly).toBe(true)
  expect((await (await fetch(base + '/api/pet/state')).json()).display.bubbleOnly).toBe(true)
  expect((await save('true')).status).toBe(400)
  const disabled = await save(false)
  expect(disabled.status).toBe(200)
  expect((await disabled.json()).display.bubbleOnly).toBe(false)
})
it('configures and resets the window through narrow endpoints', async () => {
  expect((await post('configure', { enabled: true })).status).toBe(200)
  expect((await post('reset', {})).status).toBe(200)
  expect(desktop.resetPosition).toHaveBeenCalledOnce()
})
it('blocks cross-site desktop launch and recovery', async () => {
  for (const name of ['configure', 'retry', 'reset', 'ack-open']) expect((await post(name, { enabled: true }, { origin: 'https://evil.example' })).status).toBe(403)
  expect(desktop.retry).not.toHaveBeenCalled()
})
it('rejects malformed configuration instead of spawning', async () => {
  expect((await post('configure', { enabled: 'yes' })).status).toBe(400)
})
it('acknowledges the exact navigation revision', async () => {
  expect((await post('ack-open', { revision: 9 })).status).toBe(200)
  expect(desktop.acknowledge).toHaveBeenCalledWith(9)
})
