// @vitest-environment jsdom
/**
 * The global pet entry container opts into the L2 semantic attributes
 * (issue #506): the apply body mounts [data-dsh-pet-root] with
 * data-dsh-plugin="pet" so skins can target the pet subtree. The same
 * tests pin the fiber-lifecycle contract (issue #785): a hot-reloaded or
 * re-injected bundle instance must never leave the previous React root,
 * container, or settings subscription behind, so the page always holds
 * exactly one [data-dsh-pet-root].
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import type { PetStateView } from '../service.ts'
// The npm SDK's client half is a closure-factory bundle for the GUI's
// __ModuleLoader__ (not importable under vitest); provide defineStore /
// createSnapshotStore (same fake-store pattern as the settings-card tests).
vi.mock('@deepseek-ai/dsh-client-store', () => ({
  defineStore: (spec: {
    init: () => unknown
    actions: Record<string, (draft: never, ...args: never[]) => void>
  }) => ({
    create: () => {
      let value = spec.init()
      const listeners = new Set<() => void>()
      const actions: Record<string, (...args: unknown[]) => void> = {}
      for (const [name, fn] of Object.entries(spec.actions)) {
        actions[name] = (...args: unknown[]) => {
          value = { ...(value as object) }
          fn(value as never, ...(args as never[]))
          for (const listener of listeners) listener()
        }
      }
      return {
        getSnapshot: () => value,
        subscribe: (listener: () => void) => {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        actions,
      }
    },
  }),
  createSnapshotStore: (init: unknown) => {
    let value = init
    const listeners = new Set<() => void>()
    return {
      getSnapshot: () => value,
      set: (next: unknown) => { value = next; for (const listener of listeners) listener() },
      update: (mutator: (draft: never) => void) => { mutator(value as never); for (const listener of listeners) listener() },
      subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    }
  },
}))
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { apply } from './index.ts'

beforeAll(() => {
  document.documentElement.lang = 'zh'
})

/** A client root context with observable fiber disposal. */
interface FakeClientLifecycle {
  ctx: ClientContext
  dispose(): void
  settingsListenerCount(): number
  emitSettings(): void
  sessionsListenerCount(): number
  setEnabled(enabled: boolean): void
  selectSession(id: string): void
  /** Namespaces the family settings binder was asked for (empty without one). */
  boundNamespaces(): string[]
}

const activeLifecycles: FakeClientLifecycle[] = []

afterEach(() => {
  for (const lifecycle of activeLifecycles.splice(0).reverse()) lifecycle.dispose()
  document.body.replaceChildren()
  delete window.dshPetDesktop
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

interface FakeContextOptions {
  /** Provide the dsh-web-settings family binder, as the group plugin does. */
  familyBinder?: boolean
  /** Initial value of the settings section the bound form answers with. */
  enabled?: boolean
}

function fakeContext(options: FakeContextOptions = {}): FakeClientLifecycle {
  const disposers: (() => void)[] = []
  const settingsListeners = new Set<() => void>()
  const sessionListeners = new Set<() => void>()
  const boundNamespaces: string[] = []
  let selectedSessionId: string | undefined
  let settingsValue: { enabled?: boolean } | undefined = options.enabled === undefined ? undefined : { enabled: options.enabled }
  const scope = {
    getSnapshot: () => ({
      status: 'ready',
      writable: true,
      value: settingsValue,
      base: undefined,
      user: {},
      revision: 1,
      mode: 'host',
    }),
    subscribe: (listener: () => void) => {
      settingsListeners.add(listener)
      return () => { settingsListeners.delete(listener) }
    },
  }
  const familyBinder = {
    bind: (spec: { namespace: string }) => {
      boundNamespaces.push(spec.namespace)
      return scope
    },
  }
  const ctx = {
    effect: (fn: () => unknown, _label?: string) => {
      const dispose = fn()
      if (typeof dispose !== 'function') return () => {}
      const cleanup = dispose as () => void
      disposers.push(cleanup)
      return cleanup
    },
    locale: { register: () => () => {} },
    // The family binder is optional (dsh-web-settings may be absent); both
    // answers are the shared per-entry form of this plugin's own profile entry.
    get: (name: string) => name === 'webUiSettings' && options.familyBinder === true ? familyBinder : undefined,
    configForms: { get: () => scope },
    slots: {
      // Cordis runs the factory when the slot mounts and its returned
      // disposer when the fiber disposes; mirror that so slot content
      // (settings card subscription) is cleaned with the fiber.
      inject: (_name: string, callback: () => () => void) => {
        const dispose = callback()
        if (typeof dispose === 'function') disposers.push(dispose)
        return dispose
      },
      register: () => () => {},
    },
    sessions: {
      list: {
        getSnapshot: () => ({ byId: selectedSessionId ? { [selectedSessionId]: { id: selectedSessionId, retainedBy: { mainView: 1 } } } : {} }),
        subscribe: (listener: () => void) => {
          sessionListeners.add(listener)
          return () => { sessionListeners.delete(listener) }
        },
      },
      open: () => {},
    },
  } as unknown as ClientContext
  let disposed = false
  const lifecycle: FakeClientLifecycle = {
    ctx,
    dispose: () => {
      if (disposed) return
      disposed = true
      for (const dispose of disposers.splice(0).reverse()) dispose()
    },
    settingsListenerCount: () => settingsListeners.size,
    emitSettings: () => {
      for (const listener of settingsListeners) listener()
    },
    sessionsListenerCount: () => sessionListeners.size,
    setEnabled: (enabled: boolean) => { settingsValue = { enabled } },
    selectSession: (id: string) => { selectedSessionId = id; for (const listener of sessionListeners) listener() },
    boundNamespaces: () => boundNamespaces,
  }
  activeLifecycles.push(lifecycle)
  return lifecycle
}

describe('pet client apply', () => {
  it('mounts the pet root container with the L2 data-dsh-plugin attribute (#506)', () => {
    apply(fakeContext().ctx)
    const root = document.body.querySelector('[data-dsh-pet-root]')
    expect(root).not.toBeNull()
    expect(root!.getAttribute('data-dsh-plugin')).toBe('pet')
  })

  it('keeps one global pet root when two client factories overlap (#785)', () => {
    const first = fakeContext()
    apply(first.ctx)
    const firstContainer = document.body.querySelector('[data-dsh-pet-root]')
    expect(firstContainer).not.toBeNull()

    // A rebuilt bundle re-applies while the first fiber is still draining.
    const second = fakeContext()
    apply(second.ctx)

    const roots = document.body.querySelectorAll('[data-dsh-pet-root]')
    expect(roots).toHaveLength(1)
    expect(roots[0]).not.toBe(firstContainer)
    expect(firstContainer!.isConnected).toBe(false)

    // The first instance must not resurrect its own root.
    first.emitSettings()
    expect(document.body.querySelectorAll('[data-dsh-pet-root]')).toHaveLength(1)

    // The first fiber draining later stays a no-op.
    first.dispose()
    expect(document.body.querySelectorAll('[data-dsh-pet-root]')).toHaveLength(1)
  })

  it('tears down root, container, and settings subscription on fiber disposal (#785)', () => {
    const lifecycle = fakeContext()
    apply(lifecycle.ctx)
    expect(document.body.querySelectorAll('[data-dsh-pet-root]')).toHaveLength(1)
    // The settings card controller subscribes to the same scope as the UI
    // sync, so at least the sync listener is present while the fiber lives.
    expect(lifecycle.settingsListenerCount()).toBeGreaterThan(0)

    lifecycle.dispose()

    expect(document.body.querySelectorAll('[data-dsh-pet-root]')).toHaveLength(0)
    expect(lifecycle.settingsListenerCount()).toBe(0)
  })

  it('re-applies cleanly after disposal so a hot reload keeps one pet (#785)', () => {
    const first = fakeContext()
    apply(first.ctx)
    first.dispose()
    expect(document.body.querySelectorAll('[data-dsh-pet-root]')).toHaveLength(0)

    const second = fakeContext()
    apply(second.ctx)
    expect(document.body.querySelectorAll('[data-dsh-pet-root]')).toHaveLength(1)
  })

  it('sweeps stale containers left behind by instances without a teardown slot (#785)', () => {
    // A container from a bundle build that predates the teardown registry:
    // nothing registered a teardown, so only the mount-path sweep can clear it.
    const stale = document.createElement('div')
    stale.dataset.dshPetRoot = ''
    document.body.appendChild(stale)

    apply(fakeContext().ctx)

    const roots = document.body.querySelectorAll('[data-dsh-pet-root]')
    expect(roots).toHaveLength(1)
    expect(stale.isConnected).toBe(false)
  })

  it('unsubscribes the session watch when the pet is disabled from settings', () => {
    const lifecycle = fakeContext()
    apply(lifecycle.ctx)
    // The poll loop and the current-session watch both subscribe through
    // ctx.effect, so exactly one sessions.list listener is live per mount.
    expect(lifecycle.sessionsListenerCount()).toBe(1)

    // Toggling the plugin off tears the UI down without disposing the fiber:
    // the session watch must go with it, or every later session-store
    // notification keeps polling a dead pet forever.
    lifecycle.setEnabled(false)
    lifecycle.emitSettings()
    expect(lifecycle.sessionsListenerCount()).toBe(0)
    expect(document.body.querySelectorAll('[data-dsh-pet-root]')).toHaveLength(0)

    // Re-enabling mounts a fresh UI with a fresh watch.
    lifecycle.setEnabled(true)
    lifecycle.emitSettings()
    expect(lifecycle.sessionsListenerCount()).toBe(1)
    expect(document.body.querySelectorAll('[data-dsh-pet-root]')).toHaveLength(1)
  })

  it('user gets the pet settings form through the family binder when the group plugin is mounted', () => {
    // Given a client context that provides the dsh-web-settings family binder
    // and answers 'disabled' through the form that binder returns
    const lifecycle = fakeContext({ familyBinder: true, enabled: false })

    // When the pet client plugin applies
    apply(lifecycle.ctx)

    // Then the card bound the 'pet' namespace through that binder...
    expect(lifecycle.boundNamespaces()).toEqual(['pet'])
    // ...and the pet surface followed the form it answered (disabled -> hidden)
    expect(document.body.querySelectorAll('[data-dsh-pet-root]')).toHaveLength(0)
  })
})

function desktopFixture() {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([])))
  let snapshot: PetStateView = {
    animation: 'idle', phase: 'idle', sessionActive: false,
    display: { visible: true, size: 163, right: 24, bottom: 20, bubbleScale: 1, desktopEnabled: true, multiPetEnabled: true },
    affinity: { points: 0, rank: '幼鲸', rankEmoji: '*', pets: 0, feeds: 0, turns: 0, petCooldown: false, feedCooldown: false },
    pet: { id: 'whale-girl-refined', displayName: '鲸鱼娘', description: '' }, name: '鲸鱼娘', treats: { stocked: 0, max: 20 },
  }
  const state = vi.fn(async () => snapshot)
  const configure = vi.fn(async (options: { enabled: boolean; currentSessionId?: string }) => ({ active: options.enabled }))
  window.dshPetDesktop = { state, configure, resetPosition: vi.fn(async () => ({ active: true })) }
  const lifecycle = fakeContext()
  return { state, configure, lifecycle, update: (patch: Partial<PetStateView>) => { snapshot = { ...snapshot, ...patch } },
    display: (patch: Partial<PetStateView['display']>) => { snapshot = { ...snapshot, display: { ...snapshot.display, ...patch } } } }
}

describe('desktop and embedded pet ownership', () => {
  it('opening a session promotes it without input, and only a focused visible view acknowledges completion', async () => {
    const f = desktopFixture()
    const focus = vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    f.update({ awaitingView: 7 })
    await act(async () => { apply(f.lifecycle.ctx); f.lifecycle.selectSession('finished'); await vi.advanceTimersByTimeAsync(2100) })
    expect(f.configure).toHaveBeenLastCalledWith({ enabled: true, currentSessionId: 'finished' })
    const acknowledgements = () => vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/pet/session-viewed')
    expect(acknowledgements()).toHaveLength(0)
    focus.mockReturnValue(true); visibility.mockReturnValue('hidden')
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    expect(acknowledgements()).toHaveLength(0)
    visibility.mockReturnValue('visible')
    await act(async () => { window.dispatchEvent(new Event('focus')); await vi.advanceTimersByTimeAsync(1100) })
    expect(acknowledgements()).toHaveLength(1)
    expect(JSON.parse(acknowledgements()[0]![1]!.body as string)).toEqual({ sessionId: 'finished', revision: 7 })
  })

  it('a stale response for a conversation left before completion arrives does not acknowledge it', async () => {
    const f = desktopFixture()
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    const old = await f.state()
    let resolve!: (snapshot: PetStateView) => void
    f.state.mockImplementationOnce(() => new Promise(ready => { resolve = ready }))
    f.lifecycle.selectSession('old')
    await act(async () => { apply(f.lifecycle.ctx) })
    await act(async () => { f.lifecycle.selectSession('new'); resolve({ ...old, awaitingView: 8 }); await vi.advanceTimersByTimeAsync(1100) })
    expect(vi.mocked(fetch).mock.calls.some(([url]) => url === '/api/pet/session-viewed')).toBe(false)
    expect(f.configure).toHaveBeenLastCalledWith({ enabled: true, currentSessionId: 'new' })
  })

  it('a delayed desktop acknowledgement survives newer polls and visibility recovery', async () => {
    const f = desktopFixture()
    let ready!: (result: { active: boolean }) => void
    f.configure.mockImplementationOnce(() => new Promise(resolve => { ready = resolve }))
    await act(async () => { apply(f.lifecycle.ctx) })
    await act(async () => { await vi.advanceTimersByTimeAsync(2100) })
    expect(f.state.mock.calls.length).toBeGreaterThan(1)
    await act(async () => { ready({ active: true }) })
    const root = document.querySelector<HTMLElement>('[data-dsh-pet-root]')!
    expect(root.style.display).toBe('none')
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(1100) })
    expect(root.style.display).toBe('none')
    expect(root.querySelectorAll('[data-pet-dock]')).toHaveLength(0)
  })

  it('multi-session children never mount under desktop ownership, and disabling desktop restores one embedded pet', async () => {
    const f = desktopFixture()
    await act(async () => { apply(f.lifecycle.ctx) })
    for (const id of ['a', 'b']) {
      f.update({ companions: [{ sessionId: id, primary: true, animation: 'idle', phase: 'idle', sessionActive: false, color: { palette: 'ds' } }] })
      await act(async () => { f.lifecycle.selectSession(id); await vi.advanceTimersByTimeAsync(1100) })
      expect(document.querySelectorAll('[data-pet-dock]')).toHaveLength(0)
    }
    f.display({ desktopEnabled: false, multiPetEnabled: false })
    await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
    expect(document.querySelector<HTMLElement>('[data-dsh-pet-root]')!.style.display).toBe('')
    expect(document.querySelectorAll('[data-pet-dock]')).toHaveLength(1)
  })

  it('failed desktop creation falls back, then a successful retry removes the embedded pet', async () => {
    const f = desktopFixture()
    f.configure.mockRejectedValueOnce(new Error('window creation failed'))
    await act(async () => { apply(f.lifecycle.ctx) })
    await act(async () => { await vi.advanceTimersByTimeAsync(1100) })
    expect(f.configure.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(document.querySelector<HTMLElement>('[data-dsh-pet-root]')!.style.display).toBe('none')
    expect(document.querySelectorAll('[data-pet-dock]')).toHaveLength(0)
  })
})
