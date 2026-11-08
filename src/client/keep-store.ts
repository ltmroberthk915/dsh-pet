/**
 * Browser-side keep set for the conversation row menu ("专属宠物保持"). The
 * host owns the durable flag; this store only mirrors it so an open menu row
 * renders the right label immediately and a paid toggle updates every row
 * without waiting for the next state poll.
 * @module dsh-pets-multiworkers/client/keep-store
 */

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
