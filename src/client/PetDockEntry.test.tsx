// @vitest-environment jsdom
/**
 * The hidden-state summon button opts into the L2 semantic attributes
 * (issue #506): it carries data-dsh-part="summon-button" so skins can target
 * it without hash-class selectors.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
// The npm SDK's client half is a closure-factory bundle for the GUI's
// __ModuleLoader__ (not importable under vitest); provide the defineStore
// the pet store needs (same fake-store pattern as the settings-card tests).
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
}))
import { PetDockEntry, type PetInjected } from './PetDockEntry.tsx'
import { createPetStore } from './pet-store.ts'
import { t } from './locales.ts'
import type { PetStateView } from '../service.ts'
import type { PetDefinition } from '../registry.ts'

beforeAll(() => {
  document.documentElement.lang = 'zh'
})

afterEach(cleanup)

/** Snapshot fixture with the pet hidden (the summon-button state). */
const hiddenSnapshot: PetStateView = {
  animation: 'idle',
  phase: 'idle',
  sessionActive: false,
  affinity: {
    points: 0,
    rank: '幼鲸',
    rankEmoji: '*',
    pets: 0,
    feeds: 0,
    turns: 0,
    petCooldown: false,
    feedCooldown: false,
  },
  display: { visible: false, size: 160, right: 24, bottom: 20, bubbleScale: 1 },
  pet: { id: 'whale-girl', displayName: '鲸鱼娘', description: '测试用鲸鱼娘' },
  name: '泡泡',
  treats: { stocked: 0, max: 5 },
}

function injected(): PetInjected {
  return {
    store: createPetStore().create(),
    ensure: vi.fn(),
    pet: vi.fn(),
    feed: vi.fn(),
    hide: vi.fn(),
    summon: vi.fn(),
    dragEnd: vi.fn(),
    setSessionKeep: vi.fn(),
    openSession: vi.fn(),
    feedbackDone: vi.fn(),
    gameplay: {
      touch: vi.fn(),
      setMode: vi.fn(),
      workTick: vi.fn(),
      buy: vi.fn(),
      setSkin: vi.fn(async () => ({ ok: true })),
    },
  }
}

describe('PetDockEntry L2 semantic attributes (#506)', () => {
  it('tags the summon button as the summon-button part', () => {
    const props = injected()
    props.store.actions.setSnapshot(hiddenSnapshot)
    render(<PetDockEntry {...props} t={t} />)
    const summon = screen.getByTestId('pet-summon')
    expect(summon.getAttribute('data-dsh-part')).toBe('summon-button')
  })
})

describe('PetDockEntry conversation keep wiring (对话专宠)', () => {
  /** The visible sprite needs its registry entry or the dock renders nothing. */
  const definition: PetDefinition = {
    id: 'whale-girl',
    displayName: '鲸鱼娘',
    description: '测试用鲸鱼娘',
    renderer: 'sprite2d',
    cell: { width: 192, height: 208 },
    columns: 8,
    rows: [6, 8, 8, 4, 5, 8, 6, 6, 6],
    atlasRows: 9,
    tracks: {
      idle: { frames: [0, 1], durations: [400, 400], loop: true },
    } as unknown as PetDefinition['tracks'],
    atlasUrl: '/pet/whale-girl/spritesheet.webp',
    manifestUrl: '/pet/whale-girl/pet.json',
  }
  /** A visible, per-session companion whose own conversation is `session-a`. */
  const visibleSnapshot: PetStateView = {
    ...hiddenSnapshot,
    display: { ...hiddenSnapshot.display, visible: true, hoverPanelEnabled: true },
    sessionId: 'session-a',
    currentSessionId: 'session-a',
    keptSessions: [],
  }
  /** Injected props with the registry list preloaded (the sprite needs one). */
  function injectedVisible(): PetInjected {
    const props = injected()
    props.store.actions.setPets([definition])
    return props
  }

  it('keeps the sprite own conversation when the panel toggle is used', () => {
    const props = injectedVisible()
    props.store.actions.setSnapshot(visibleSnapshot)
    render(<PetDockEntry {...props} t={t} />)
    fireEvent.pointerOver(screen.getByRole('button', { name: '鲸鱼娘' }))
    fireEvent.click(screen.getByText('保持对话专宠'))
    expect(props.setSessionKeep).toHaveBeenCalledWith('session-a', true)
  })

  it('releases it again when the host already reports the keep', () => {
    const props = injectedVisible()
    props.store.actions.setSnapshot({ ...visibleSnapshot, keptSessions: ['session-a'] })
    render(<PetDockEntry {...props} t={t} />)
    fireEvent.pointerOver(screen.getByRole('button', { name: '鲸鱼娘' }))
    const button = screen.getByText('取消对话专宠').closest('button')!
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(props.setSessionKeep).toHaveBeenCalledWith('session-a', false)
  })

  it('hides the action when no conversation is reported yet', () => {
    const props = injectedVisible()
    props.store.actions.setSnapshot({ ...visibleSnapshot, sessionId: undefined, currentSessionId: undefined })
    render(<PetDockEntry {...props} t={t} />)
    fireEvent.pointerOver(screen.getByRole('button', { name: '鲸鱼娘' }))
    expect(screen.getByText('喂食')).toBeTruthy()
    expect(screen.queryByText('保持对话专宠')).toBeNull()
  })

  it('hides the action on a surface without the host keep endpoint', () => {
    const props = { ...injectedVisible(), setSessionKeep: undefined }
    props.store.actions.setSnapshot(visibleSnapshot)
    render(<PetDockEntry {...props} t={t} />)
    fireEvent.pointerOver(screen.getByRole('button', { name: '鲸鱼娘' }))
    expect(screen.queryByText('保持对话专宠')).toBeNull()
  })
})
