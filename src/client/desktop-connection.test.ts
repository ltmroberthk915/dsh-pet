// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import type { DesktopStatus } from '../desktop-status.ts'
const status: DesktopStatus = { supported: true, state: 'ready', active: true, version: '1.2.0' }
afterEach(() => { delete window.dshPetDesktop; vi.unstubAllGlobals(); vi.resetModules() })

it('turns off the old patched renderer before enabling the package window', async () => {
  const order: string[] = []
  let finish!: () => void
  window.dshPetDesktop = { configure: async () => { order.push('old off'); await new Promise<void>(resolve => { finish = resolve }); return { active: false } }, state: vi.fn(), resetPosition: vi.fn() }
  vi.stubGlobal('fetch', vi.fn(async () => { order.push('new on'); return { ok: true, json: async () => status } }))
  const { desktopConnection } = await import('./desktop-connection.ts')
  const pending = desktopConnection(status)!.configure({ enabled: true })
  await Promise.resolve()
  expect(order).toEqual(['old off'])
  finish()
  expect((await pending).active).toBe(true)
  expect(order).toEqual(['old off', 'new on'])
})

it('works with no native preload patch and exposes only pet operations', async () => {
  const fetch = vi.fn(async () => ({ ok: true, json: async () => status }))
  vi.stubGlobal('fetch', fetch)
  const { desktopConnection } = await import('./desktop-connection.ts')
  const bridge = desktopConnection(status)!
  await bridge.configure({ enabled: true, currentSessionId: 'test' })
  await bridge.resetPosition()
  expect(fetch.mock.calls.map(call => (call as unknown[])[0])).toEqual(['/api/pet/desktop/configure', '/api/pet/desktop/reset'])
})

it('retains a legacy bridge on an unsupported platform', async () => {
  const legacy = { configure: vi.fn(), state: vi.fn(), resetPosition: vi.fn() }
  window.dshPetDesktop = legacy
  const { desktopConnection } = await import('./desktop-connection.ts')
  expect(desktopConnection({ ...status, supported: false })).toBe(legacy)
})
