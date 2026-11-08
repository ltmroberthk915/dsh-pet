// @vitest-environment jsdom
/**
 * The conversation row menu contributes "专属宠物保持". The row is a plain
 * menuitem button (the harness forbids importing its client UI primitives), so
 * these tests pin its label toggle, the menu dismissal, and the host call.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { KeepPetMenuItem } from './KeepPetMenuItem.tsx'
import { createKeepStore } from './keep-store.ts'
import { NS, t } from './locales.ts'

const translate = t as unknown as TranslateNS<typeof NS>

afterEach(() => {
  document.documentElement.lang = 'zh'
  document.body.replaceChildren()
})

function setup(kept = false) {
  const keepStore = createKeepStore()
  keepStore.setSessions(kept ? ['session-a'] : [])
  const setSessionKeep = vi.fn()
  const ensureKeepLoaded = vi.fn()
  const closeMenu = vi.fn()
  let open = true
  const tree = render(
    <KeepPetMenuItem
      sessionId="session-a"
      displayTitle="测试会话"
      keepStore={keepStore}
      ensureKeepLoaded={ensureKeepLoaded}
      setSessionKeep={setSessionKeep}
      useMenuOpenState={() => [open, (next: boolean) => { open = next; closeMenu(next) }] as const}
      t={translate}
    />,
  )
  return { ...tree, keepStore, setSessionKeep, ensureKeepLoaded, closeMenu }
}

describe('keep menu row', () => {
  it('renders the add action, reads the host on mount and keeps the conversation on click', () => {
    const f = setup(false)
    expect(f.ensureKeepLoaded).toHaveBeenCalledTimes(1)
    const button = f.getByRole('menuitem') as HTMLButtonElement
    expect(button.textContent).toContain('专属宠物保持')
    expect(button.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(button)
    expect(f.closeMenu).toHaveBeenCalledWith(false)
    expect(f.setSessionKeep).toHaveBeenCalledWith('session-a', true)
  })

  it('switches to the release action once the host reports the keep, and releases on click', () => {
    const f = setup(false)
    act(() => { f.keepStore.setSessions(['session-a']) })
    const button = f.getByRole('menuitem') as HTMLButtonElement
    expect(button.textContent).toContain('取消专属宠物保持')
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(f.setSessionKeep).toHaveBeenCalledWith('session-a', false)
  })

  it('disables the row without a conversation identity', () => {
    const keepStore = createKeepStore()
    const tree = render(
      <KeepPetMenuItem
        keepStore={keepStore}
        ensureKeepLoaded={() => {}}
        setSessionKeep={() => {}}
        t={translate}
      />,
    )
    const button = tree.getByRole('menuitem') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })
})
