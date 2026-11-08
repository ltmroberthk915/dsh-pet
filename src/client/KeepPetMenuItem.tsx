/**
 * "专属宠物保持" row in a conversation's "..." menu. Keeping a conversation
 * suppresses exactly one thing: the retirement of its own main-agent pet after
 * the result was viewed and the user left the conversation. The pet still
 * follows the focused conversation for its primary/secondary size, and a
 * subagent's own pet keeps the ordinary show/hide rules.
 *
 * The row is a plain `role="menuitem"` button styled to match the host menu
 * (the harness forbids loading its client UI primitives as a module). The menu
 * supplies the keyboard walk; the row only closes the menu and calls the host.
 * @module dsh-pets-multiworkers/client/KeepPetMenuItem
 */

import { useEffect, useSyncExternalStore } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { KeepStore } from './keep-store.ts'
import { NS } from './locales.ts'
import styles from './session-keep.module.css'

/** Injected share the client apply body hands each row instance. */
export interface KeepPetMenuInjected {
  /** Mirror of the host's kept conversation ids. */
  keepStore: KeepStore
  /** Read the host once when no state poll has answered yet. */
  ensureKeepLoaded: () => void
  /** Persist one toggle; the host answers with the whole kept list. */
  setSessionKeep: (sessionId: string, keep: boolean) => void
}

/**
 * Props of one row: the slot's owner share (the conversation), the menu's
 * bound open-state hook, the locale seat, and this entry's injected share.
 */
export interface KeepPetMenuProps extends KeepPetMenuInjected {
  sessionId?: string
  displayTitle?: string
  useMenuOpenState?: () => readonly [boolean, (open: boolean) => void]
  t?: TranslateNS<typeof NS>
}

/** Fallback when the slot contract did not bind the menu hook (tests/direct mounts). */
const CLOSED_MENU: readonly [boolean, (open: boolean) => void] = [false, () => {}]
function useNoMenuOpenState(): readonly [boolean, (open: boolean) => void] {
  return CLOSED_MENU
}

/** Paw glyph; a filled paw reads as "kept", an outline as "not kept". */
function PawIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? 0 : 1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="4.1" cy="6.1" rx="1.4" ry="1.75" />
      <ellipse cx="7.4" cy="4.5" rx="1.4" ry="1.8" />
      <ellipse cx="10.8" cy="5.2" rx="1.4" ry="1.8" />
      <ellipse cx="13.1" cy="8.1" rx="1.2" ry="1.5" transform="rotate(24 13.1 8.1)" />
      <path d="M4.9 11.6c.3-2 2.2-3.4 3.9-3.4s3.6 1.4 3.9 3.4c.2 1.4-.7 2.3-1.9 2.1-.9-.2-1.4-.5-2-.5s-1.1.3-2 .5c-1.2.2-2.1-.7-1.9-2.1Z" />
    </svg>
  )
}

/**
 * One menu row: toggles the conversation's keep flag. The label names the
 * action (keep / release), matching the host pin row's toggle pattern.
 */
export function KeepPetMenuItem(props: KeepPetMenuProps) {
  const { sessionId, displayTitle, keepStore } = props
  const state = useSyncExternalStore(keepStore.subscribe, keepStore.getSnapshot)
  const menuHook = props.useMenuOpenState ?? useNoMenuOpenState
  const menu = menuHook()
  const closeMenu = (): void => {
    try {
      menu[1](false)
    } catch {
      // The menu may already be gone (Escape, outside click); keep toggling.
    }
  }
  useEffect(() => {
    props.ensureKeepLoaded()
  }, [props.ensureKeepLoaded])
  const translate = props.t ?? ((key: string) => key)
  const disabled = typeof sessionId !== 'string' || sessionId.length === 0
  const kept = !disabled && state.kept.has(sessionId)
  const label = translate(kept ? 'pet.menu.unkeep' : 'pet.menu.keep')
  const title = disabled
    ? label
    : `${label} — ${typeof displayTitle === 'string' && displayTitle.length > 0 ? displayTitle : sessionId}`
  const onSelect = (event: { preventDefault?: () => void, stopPropagation?: () => void }): void => {
    event.preventDefault?.()
    event.stopPropagation?.()
    closeMenu()
    if (disabled) return
    props.setSessionKeep(sessionId, !kept)
  }
  return (
    <div className={styles.row}>
      <button
        type="button"
        role="menuitem"
        className={styles.item}
        disabled={disabled}
        title={title}
        aria-label={label}
        aria-pressed={kept}
        data-dsh-part="pet-session-keep"
        onClick={onSelect}
      >
        <span className={kept ? `${styles.icon} ${styles.iconActive}` : styles.icon} aria-hidden="true">
          <PawIcon filled={kept} />
        </span>
        <span className={styles.label}>{label}</span>
        {kept && <span className={styles.check} aria-hidden="true">✓</span>}
      </button>
    </div>
  )
}
