import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { PetService } from './service.ts'
import { loadPetRegistry, petPackageRoot } from './registry.ts'
import { chooseSessionColor, loadSessionColors, modelPalette, type SessionColor } from './session-colors.ts'
import { effectiveFps } from './animation.ts'

afterEach(() => vi.useRealTimers())
function setup() {
  const ctx = new Context(), dir = mkdtempSync(join(tmpdir(), 'dsh-pet-multi-'))
  const registry = loadPetRegistry({ packageRoot: petPackageRoot(import.meta.url), singlePet: true, petsDir: '', dshPetsDir: '' })
  const service = new PetService(ctx, { registry, persistDir: dir })
  ctx.provide('sessionProjections', { stateOf: (session: any) => ({ decodeTokens: session.rate * 10, decodeMs: 10000 }) })
  const session = (id: string, model: string, rate = 100) => ({ id, header: {}, rate, config: { model, provider: 'proxy' }, requestHeader() { return { config: this.config } } })
  const phase = (s: any, p: string) => ctx.emit('session/event', s, { type: 'activity/status', data: { phase: p, line: p + ':' + s.id } } as any)
  return { ctx, dir, registry, service, session, phase }
}
describe('per-conversation desktop pets', () => {
  it('carries the selected subagent own generation and footer speed through the primary companion', async () => {
    const f = setup(), parent = f.session('parent', 'gpt-6', 30)
    const child = { ...f.session('child', 'claude', 279), header: { origin: 'subagent' } }
    const sibling = { ...f.session('sibling', 'gpt-6', 80), header: { origin: 'subagent' } }
    await f.service.setConfig({ multiPetEnabled: true, animationMode: 'tick', animationTickSlope: 1, animationTickIntercept: 1 })
    for (const session of [parent, child, sibling]) f.ctx.emit('agent/assistant-stream', { agent: { session }, frame: {
      type: 'chunk', attemptId: session.id, revision: 1, chunk: { type: 'reasoning-delta', index: 0, text: 'working' },
    } } as any)
    let state = await f.service.state(child.id)
    const selected = state.companions!.find(c => c.primary)!
    expect(selected).toMatchObject({ sessionId: 'child', generation: 'reasoning', animation: 'running-right', performance: { tokensPerSecond: 279, sessionId: 'child' } })
    expect(effectiveFps(state.display, selected.performance?.tokensPerSecond)).toBe(280)
    expect(state.companions!.find(c => c.sessionId === 'parent')?.performance?.tokensPerSecond).toBe(30)
    expect(state.companions!.some(c => c.sessionId === 'sibling')).toBe(false)
    child.rate = 160
    state = await f.service.state(child.id)
    expect(effectiveFps(state.display, state.companions!.find(c => c.primary)?.performance?.tokensPerSecond)).toBe(161)
    expect((await f.service.state(parent.id)).companions!.map(c => c.sessionId)).toEqual(['parent'])
  })

  it('keeps left/right generation and critical bubbles isolated to their own session', async () => {
    const f = setup(), a = f.session('motion-a', 'gpt-6', 264), b = f.session('motion-b', 'claude', 80)
    await f.service.setConfig({ multiPetEnabled: true, animationMode: 'tick', animationTickSlope: .18, animationTickIntercept: 5 })
    const stream = (session: any, chunk: any) => f.ctx.emit('agent/assistant-stream', { agent: { session }, frame: { type: 'chunk', attemptId: session.id, revision: 1, chunk } } as any)
    stream(a, { type: 'reasoning-delta', index: 0, text: 'reasoning' })
    stream(b, { type: 'tool-call-delta', index: 0, id: 'edit', name: 'apply_patch', argumentsDelta: 'patch' })
    const state = await f.service.state(a.id)
    expect(state).toMatchObject({ animation: 'running-right', generation: 'reasoning', performance: { tokensPerSecond: 264 } })
    expect(state.companions?.find(c => c.sessionId === b.id)).toMatchObject({ primary: false, animation: 'running-left', generation: 'tool-arguments', performance: { tokensPerSecond: 80 } })
    expect((await f.service.state(b.id)).companions?.find(c => c.sessionId === b.id)?.primary).toBe(true)
    f.ctx.emit('session/event', b as any, { type: 'turn/end', data: { turn: 1, reason: { kind: 'error', error: { message: 'boom' } } } } as any)
    const failed = await f.service.state(b.id)
    expect(failed).toMatchObject({ animation: 'failed', generation: undefined })
    expect(failed.sessions?.[0]?.bubble).toBe('这一轮出错了')
    expect(failed.sessions?.[0]?.whisper).toBeUndefined()
    expect(failed.companions?.find(c => c.sessionId === b.id)?.whisper).toBeUndefined()
    expect(failed.companions?.find(c => c.sessionId === a.id)?.generation).toBe('reasoning')
    f.ctx.emit('session/event', a as any, { type: 'turn/end', data: { turn: 1, reason: { kind: 'blocked' } } } as any)
    const blocked = await f.service.state(a.id)
    expect(blocked).toMatchObject({ animation: 'waiting', generation: undefined })
    expect(blocked.sessions?.[0]?.whisper).toBeUndefined()
    expect(blocked.display).toMatchObject({ animationTickSlope: .18, animationTickIntercept: 5 })
  })
  it('shares feeding, affinity, treats and cooldowns across sessions, mode changes and restart', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T12:00:00Z'))
    const f = setup(), a = f.session('shared-a', 'gpt-6'), b = f.session('shared-b', 'claude')
    await f.service.setConfig({ multiPetEnabled: true })
    // Identical turn numbers in different sessions count separately; a replay does not.
    for (let turn = 1; turn <= 30; turn++) for (const session of [a, b]) {
      const event = { type: 'turn/end', seq: turn, time: turn, data: { turn, reason: { kind: 'completed' } } } as any
      f.ctx.emit('session/event', session as any, event)
      f.ctx.emit('session/event', session as any, event)
    }
    f.phase(a, 'thinking'); f.phase(b, 'thinking')
    expect((await f.service.state('shared-a')).affinity).toMatchObject({ points: 60, turns: 60, feeds: 0 })
    expect((await f.service.state('shared-b')).treats.stocked).toBe(2)
    expect((await f.service.interact('feed')).delta).toBe(5)
    const first = await f.service.state('shared-b')
    expect(first.affinity).toMatchObject({ points: 65, feeds: 1, feedCooldown: true })
    expect(first.treats.stocked).toBe(1)
    // Switching to another window cannot bypass the shared cooldown or spend twice.
    expect((await f.service.interact('feed')).delta).toBe(0)
    expect((await f.service.state('shared-a')).treats.stocked).toBe(1)
    vi.advanceTimersByTime(30_001)
    expect((await f.service.interact('feed')).delta).toBe(5)
    for (const enabled of [false, true]) {
      await f.service.setConfig({ multiPetEnabled: enabled })
      for (const id of ['shared-a', 'shared-b', '']) {
        const state = await f.service.state(id)
        expect(state.affinity).toMatchObject({ points: 70, turns: 60, feeds: 2 })
        expect(state.treats.stocked).toBe(0)
      }
    }
    const restarted = new PetService(new Context(), { registry: f.registry, persistDir: f.dir })
    expect((await restarted.state('shared-b')).affinity).toMatchObject({ points: 70, turns: 60, feeds: 2 })
    expect((await restarted.state('shared-a')).treats.stocked).toBe(0)
  })
  it('single mode binds animation, bubbles and footer speed to the same selected session', async () => {
    const f = setup(), a = f.session('a', 'gpt-6', 264), b = f.session('b', 'claude', 80)
    f.ctx.emit('agent/assistant-stream', { agent: { session: a }, frame: { type: 'chunk', attemptId: 'a-1', revision: 1, chunk: { type: 'reasoning-delta', index: 0, text: 'thinking' } } } as any)
    f.phase(b, 'tool')
    const state = await f.service.state('a')
    expect(state.animation).toBe('running-right')
    expect(state.sessions?.map(s => s.sessionId)).toEqual(['a'])
    expect(state.performance?.tokensPerSecond).toBe(264)
    expect(state.color).toEqual({ palette: 'ds' })
    expect(state.companions).toEqual([])
    expect((await f.service.state('missing')).animation).toBe('idle')
    expect((await f.service.state('')).sessions).toEqual([])
  })
  it('assigns model colors once, preserves them across model changes and restarts, and never writes on reads', async () => {
    const f = setup()
    await f.service.setConfig({ multiPetEnabled: true })
    const sessions = ['gpt-6', 'claude-opus', 'kimi-k2', 'glm-5', 'deepseek-v4'].map((m, i) => f.session(String(i), m, 20 + i))
    for (const s of sessions) f.phase(s, 'thinking')
    let state = await f.service.state('0')
    expect(state.companions?.map(c => c.color.palette)).toEqual(['gpt', 'claude', 'kimi', 'glm', 'ds'])
    expect(state.companions?.map(c => c.performance?.tokensPerSecond)).toEqual([20, 21, 22, 23, 24])
    sessions[0]!.config.model = 'deepseek-v4'; f.phase(sessions[0], 'review')
    state = await f.service.state('1')
    expect(state.companions?.find(c => c.sessionId === '0')?.color.palette).toBe('gpt')
    expect(state.companions?.filter(c => c.primary).map(c => c.sessionId)).toEqual(['1'])
    const before = statSync(join(f.dir, 'pet.json')).mtimeMs
    await f.service.state('0'); await f.service.state('1')
    expect(statSync(join(f.dir, 'pet.json')).mtimeMs).toBe(before)
    const copy = new PetService(new Context(), { registry: f.registry, persistDir: f.dir })
    expect((await copy.state()).display.multiPetEnabled).toBe(true)
    expect(JSON.parse(readFileSync(join(f.dir, 'pet.json'), 'utf8')).sessionColors['0']).toEqual({ palette: 'gpt' })
    await f.service.setConfig({ multiPetEnabled: false })
    expect((await f.service.state('0')).color).toEqual({ palette: 'ds' })
    await f.service.setConfig({ multiPetEnabled: true })
    expect((await f.service.state('0')).companions?.find(c => c.sessionId === '0')?.color.palette).toBe('gpt')
  })
  it('keeps finished background pets until viewed, then retires them after leaving the main conversation', async () => {
    const f = setup(); await f.service.setConfig({ multiPetEnabled: true })
    const sessions = Array.from({ length: 16 }, (_, i) => f.session(String(i), 'gpt-6'))
    for (const s of sessions) f.phase(s, 'thinking')
    const child = { ...f.session('child', 'gpt-6'), header: { origin: 'subagent' } }; f.phase(child, 'thinking')
    expect((await f.service.state('0')).companions).toHaveLength(16)
    f.phase(sessions[1], 'idle')
    const pending = (await f.service.state('0')).companions?.find(c => c.sessionId === '1')
    expect(pending).toMatchObject({ primary: false, animation: 'idle', awaitingView: expect.any(Number) })
    const opened = await f.service.state('1')
    // A read, including a background native poll of the selected session, is not a view acknowledgement.
    expect(opened.awaitingView).toBe(pending?.awaitingView)
    await f.service.markSessionViewed('1', opened.awaitingView!)
    expect((await f.service.state('1')).companions?.find(c => c.sessionId === '1')).toMatchObject({ primary: true, animation: 'idle' })
    expect((await f.service.state('0')).companions?.some(c => c.sessionId === '1')).toBe(false)
    for (const s of sessions) f.phase(s, 'idle')
    for (const s of sessions) {
      const state = await f.service.state(s.id)
      if (state.awaitingView !== undefined) await f.service.markSessionViewed(s.id, state.awaitingView)
    }
    expect((await f.service.state('0')).companions).toEqual([expect.objectContaining({ sessionId: '0', primary: true, animation: 'idle' })])
  })
  it('retains completed, failed and stopped results beyond animation expiry, without writing on polls', async () => {
    vi.useFakeTimers()
    const f = setup(); await f.service.setConfig({ multiPetEnabled: true })
    const sessions = ['done', 'failed', 'idle'].map((phase, i) => {
      const s = f.session(String(i), 'gpt-6'); f.phase(s, 'thinking'); f.phase(s, phase); return s
    })
    const file = join(f.dir, 'pet.json'), original = readFileSync(file, 'utf8')
    vi.advanceTimersByTime(24 * 60 * 60 * 1000)
    for (let i = 0; i < 3; i++) {
      const pending = (await f.service.state('main')).companions?.filter(c => !c.primary)
      expect(pending).toHaveLength(3)
      expect(pending?.every(c => c.animation === 'idle' && c.awaitingView !== undefined)).toBe(true)
    }
    expect(readFileSync(file, 'utf8')).toBe(original)
    f.ctx.emit('session/disposed', sessions[2] as any)
    expect((await f.service.state('main')).companions?.some(c => c.sessionId === '2')).toBe(false)
  })
  it('does not let an old view acknowledgement consume a new turn or release working pets', async () => {
    const f = setup(), s = f.session('repeat', 'gpt-6')
    await f.service.setConfig({ multiPetEnabled: true })
    f.phase(s, 'thinking'); f.phase(s, 'idle')
    const oldRevision = (await f.service.state(s.id)).awaitingView!
    f.phase(s, 'thinking')
    await f.service.markSessionViewed(s.id, oldRevision)
    expect((await f.service.state('other')).companions?.some(c => c.sessionId === s.id)).toBe(true)
    f.phase(s, 'idle')
    await f.service.markSessionViewed(s.id, oldRevision)
    const fresh = await f.service.state(s.id)
    expect(fresh.awaitingView).toBeGreaterThan(oldRevision)
    await f.service.markSessionViewed(s.id, fresh.awaitingView!)
    expect((await f.service.state('other')).companions?.some(c => c.sessionId === s.id)).toBe(false)
    await expect(f.service.markSessionViewed('', 1)).rejects.toThrow('invalid-viewed-session')
    await expect(f.service.markSessionViewed(s.id, NaN)).rejects.toThrow('invalid-viewed-session')
  })
  it('reserves waiting-pet colors and does not prune unread completions at the activity cache limit', async () => {
    const f = setup(); await f.service.setConfig({ multiPetEnabled: true })
    for (let i = 0; i < 130; i++) {
      const s = f.session('pending-' + i, 'gpt-6'); f.phase(s, 'thinking'); f.phase(s, 'idle')
    }
    const waiting = (await f.service.state('main')).companions?.filter(c => !c.primary) ?? []
    expect(waiting).toHaveLength(130)
    expect(new Set(waiting.slice(0, 5).map(c => c.color.palette)).size).toBe(5)
  })
  it('waits for a real model header before freezing a color, and rejects malformed switches', async () => {
    const f = setup(), s = f.session('late', '')
    f.phase(s, 'waiting')
    s.config.model = 'kimi-k2'; f.phase(s, 'thinking')
    await f.service.setConfig({ multiPetEnabled: true })
    expect((await f.service.state('late')).companions?.[0]?.color.palette).toBe('kimi')
    await expect(f.service.setConfig({ multiPetEnabled: 'yes' as any })).rejects.toThrow('invalid-multiPetEnabled')
  })
  it('prefers resolved model route metadata over a provider alias', async () => {
    const f = setup(), s = { ...f.session('resolved', 'friendly-proxy-model'),
      requestContext: () => ({ model: 'glm-5', provider: 'openai-compatible' }) }
    await f.service.setConfig({ multiPetEnabled: true })
    f.phase(s, 'thinking')
    expect((await f.service.state('resolved')).companions?.[0]?.color.palette).toBe('glm')
  })
})
describe('palette allocation', () => {
  it('uses the underlying model ahead of the provider and sanitizes persisted values', () => {
    expect(modelPalette('kimi-k2', 'openai-compatible')).toBe('kimi')
    expect(modelPalette('anthropic/claude-opus', 'deepseek')).toBe('claude')
    expect(loadSessionColors({ a: { palette: '../../bad' }, b: { palette: 'ds', hue: Infinity }, c: { palette: 'glm' } })).toEqual({ c: { palette: 'glm' } })
  })
  it('uses five distinct base colors before choosing widely separated extra hues', () => {
    const colors: SessionColor[] = []
    for (let n = 0; n < 12; n++) colors.push(chooseSessionColor('gpt', colors, () => 0.42))
    expect(new Set(colors.slice(0, 5).map(c => c.palette)).size).toBe(5)
    expect(new Set(colors.slice(5).map(c => c.hue)).size).toBe(7)
  })
})
