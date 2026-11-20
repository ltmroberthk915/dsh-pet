/**
 * Browser-side keep set for the conversation row menu ("对话专宠"). The
 * host owns the durable flag; this store only mirrors it so an open menu row
 * renders the right label immediately and a paid toggle updates every row
 * without waiting for the next state poll. The pet's own care panel reads the
 * same snapshot straight from the state view (see keepTargetId/sessionKept),
 * because each sprite already re-renders on every poll.
 * @module dsh-pets-multiworkers/client/keep-store
 */

import type { PetStateView } from '../service.ts'

/** Snapshot handed to the row component through `useSyncExternalStore`. */
export interface KeepStoreSnapshot {
  /** True once a host answer (state poll or explicit read) has landed. */
  loaded: boolean
  /** Conversations whose main-agent pet is kept on screen. */
  kept: ReadonlySet<string>
}

/** The browser-side mirror of the host's kept conversation ids. */
export interface KeepStore {
  /** Current snapshot (stable reference while the set is unchanged). */
  getSnapshot: () => KeepStoreSnapshot
  /** Subscribe to snapshot replacement. */
  subscribe: (listener: () => void) => () => void
  /** Replace the set from a host answer (state poll or toggle response). */
  setSessions: (ids: readonly string[]) => void
  /**
   * Read the host once when nothing has answered yet. Failures keep the store
   * unloaded so the next menu open retries; concurrent callers share one
   * request.
   * @param load - the host read returning the kept ids.
   */
  ensureLoaded: (load: () => Promise<readonly string[]>) => void
}

/** Set equality, so an unchanged poll payload does not wake the menu row. */
function sameMembers(previous: ReadonlySet<string>, next: ReadonlySet<string>): boolean {
  if (previous.size !== next.size) return false
  for (const id of next) if (!previous.has(id)) return false
  return true
}

/**
 * The conversation a sprite's care panel keeps ("对话专宠"). A per-session
 * companion carries its own `sessionId`; the single-pet view only reports the
 * GUI's current conversation through `currentSessionId`. Undefined means the
 * sprite has no conversation to keep — the new-conversation screen (nothing
 * owns the flag) or a subagent conversation (`keepable === false`: its pet
 * follows the ordinary show/hide rules and the host refuses the write) — and
 * the panel action stays hidden instead of writing a flag that cannot mean
 * anything.
 * @param view - the state snapshot the sprite renders.
 * @returns the conversation id, or undefined when there is none to keep.
 */
export function keepTargetId(
  view: Pick<PetStateView, 'sessionId' | 'currentSessionId' | 'keepable'> | null | undefined,
): string | undefined {
  if (view === null || view === undefined || view.keepable === false) return undefined
  const id = view.sessionId !== undefined && view.sessionId !== '' ? view.sessionId : view.currentSessionId
  return typeof id === 'string' && id !== '' ? id : undefined
}

/**
 * Whether one conversation's pet is kept ("对话专宠"), as the host reports it
 * in the state snapshot. The host owns the durable flag; the panel only reads.
 * @param view - the state snapshot the sprite renders.
 * @param sessionId - the conversation the sprite stands for.
 * @returns true when that conversation's pet is kept.
 */
export function sessionKept(view: Pick<PetStateView, 'keptSessions'> | null | undefined, sessionId: string | undefined): boolean {
  return sessionId !== undefined && view?.keptSessions?.includes(sessionId) === true
}

/** Create the keep store (apply world only; one per client bundle instance). */
export function createKeepStore(): KeepStore {
  let snapshot: KeepStoreSnapshot = { loaded: false, kept: new Set() }
  const listeners = new Set<() => void>()
  let loading = false
  const publish = (next: KeepStoreSnapshot): void => {
    snapshot = next
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch {
        // A broken subscriber must not stop the rest of the menu from updating.
      }
    }
  }
  const store: KeepStore = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    setSessions: (ids) => {
      const kept = new Set(ids.filter(id => typeof id === 'string' && id !== ''))
      if (snapshot.loaded && sameMembers(snapshot.kept, kept)) return
      publish({ loaded: true, kept })
    },
    ensureLoaded: (load) => {
      if (snapshot.loaded || loading) return
      loading = true
      load().then(
        (ids) => {
          loading = false
          // A state poll may have landed first; it is authoritative and newer.
          if (!snapshot.loaded) store.setSessions(ids)
        },
        () => { loading = false },
      )
    },
  }
  return store
}
