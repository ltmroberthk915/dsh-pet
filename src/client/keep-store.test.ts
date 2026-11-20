/**
 * The keep store mirrors the host's kept conversation ids for the row menu.
 * These tests pin the two properties the menu relies on: an unchanged 2 s poll
 * must not wake the row, and a failed read stays retryable. The pet's own care
 * panel reads the same host truth straight from the snapshot state view, so
 * the two helpers it uses are pinned here as well.
 */
import { describe, expect, it, vi } from 'vitest'
import { createKeepStore, keepTargetId, sessionKept } from './keep-store.ts'

describe('keep store', () => {
  it('publishes the first host answer once and skips identical later polls', () => {
    const store = createKeepStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.setSessions(['a', 'b'])
    expect(store.getSnapshot()).toEqual({ loaded: true, kept: new Set(['a', 'b']) })
    expect(listener).toHaveBeenCalledTimes(1)
    const stable = store.getSnapshot()
    store.setSessions(['b', 'a'])
    expect(store.getSnapshot()).toBe(stable)
    expect(listener).toHaveBeenCalledTimes(1)
    store.setSessions(['a'])
    expect(store.getSnapshot().kept).toEqual(new Set(['a']))
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('reads the host once, shares that request, and retries after a failure', async () => {
    const store = createKeepStore()
    let resolve: (ids: string[]) => void = () => {}
    const load = vi.fn(() => new Promise<string[]>((done) => { resolve = done }))
    store.ensureLoaded(load)
    store.ensureLoaded(load)
    expect(load).toHaveBeenCalledTimes(1)
    resolve(['kept'])
    await Promise.resolve()
    await Promise.resolve()
    expect(store.getSnapshot()).toEqual({ loaded: true, kept: new Set(['kept']) })

    const failing = createKeepStore()
    const failure = vi.fn(() => Promise.reject(new Error('offline')))
    failing.ensureLoaded(failure)
    await Promise.resolve()
    await Promise.resolve()
    expect(failing.getSnapshot().loaded).toBe(false)
    failing.ensureLoaded(failure)
    expect(failure).toHaveBeenCalledTimes(2)
  })

  it('does not re-read the host after a poll answer has landed', () => {
    const store = createKeepStore()
    store.setSessions(['from-poll'])
    const load = vi.fn(() => Promise.resolve(['stale']))
    store.ensureLoaded(load)
    expect(load).not.toHaveBeenCalled()
    expect(store.getSnapshot().kept).toEqual(new Set(['from-poll']))
  })
})

describe('care-panel keep target', () => {
  it('prefers the sprite own conversation and falls back to the GUI current one', () => {
    // A per-session companion carries its own id; the single-pet view only
    // reports the GUI's current conversation.
    expect(keepTargetId({ sessionId: 'companion', currentSessionId: 'focused' })).toBe('companion')
    expect(keepTargetId({ currentSessionId: 'focused' })).toBe('focused')
    expect(keepTargetId({ sessionId: '', currentSessionId: 'focused' })).toBe('focused')
  })

  it('reports no target on the new-conversation screen', () => {
    expect(keepTargetId({})).toBeUndefined()
    expect(keepTargetId({ currentSessionId: '' })).toBeUndefined()
    expect(keepTargetId(null)).toBeUndefined()
    expect(keepTargetId(undefined)).toBeUndefined()
  })

  it('reports no target for a subagent conversation, which is never kept', () => {
    // The host refuses the write and its pet always follows the ordinary
    // show/hide rules, so the panel must not offer the action at all.
    expect(keepTargetId({ sessionId: 'child', currentSessionId: 'child', keepable: false })).toBeUndefined()
    expect(keepTargetId({ sessionId: 'child', keepable: false })).toBeUndefined()
    // A top-level conversation explicitly reports keepable true.
    expect(keepTargetId({ sessionId: 'top', keepable: true })).toBe('top')
  })

  it('reads the kept flag from the host list in the same snapshot', () => {
    expect(sessionKept({ keptSessions: ['a', 'b'] }, 'a')).toBe(true)
    expect(sessionKept({ keptSessions: ['a'] }, 'b')).toBe(false)
    expect(sessionKept({}, 'a')).toBe(false)
    // A sprite with no conversation can never be kept, however the list looks.
    expect(sessionKept({ keptSessions: ['a'] }, undefined)).toBe(false)
    expect(sessionKept(null, 'a')).toBe(false)
  })
})
