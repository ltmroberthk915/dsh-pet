/**
 * The keep store mirrors the host's kept conversation ids for the row menu.
 * These tests pin the two properties the menu relies on: an unchanged 2 s poll
 * must not wake the row, and a failed read stays retryable.
 */
import { describe, expect, it, vi } from 'vitest'
import { createKeepStore } from './keep-store.ts'

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
