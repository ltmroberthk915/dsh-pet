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
    loaded: boolean;
    /** Conversations whose main-agent pet is kept on screen. */
    kept: ReadonlySet<string>;
}
/** The browser-side mirror of the host's kept conversation ids. */
export interface KeepStore {
    /** Current snapshot (stable reference while the set is unchanged). */
    getSnapshot: () => KeepStoreSnapshot;
    /** Subscribe to snapshot replacement. */
    subscribe: (listener: () => void) => () => void;
    /** Replace the set from a host answer (state poll or toggle response). */
    setSessions: (ids: readonly string[]) => void;
    /**
     * Read the host once when nothing has answered yet. Failures keep the store
     * unloaded so the next menu open retries; concurrent callers share one
     * request.
     * @param load - the host read returning the kept ids.
     */
    ensureLoaded: (load: () => Promise<readonly string[]>) => void;
}
/** Create the keep store (apply world only; one per client bundle instance). */
export declare function createKeepStore(): KeepStore;
//# sourceMappingURL=keep-store.d.ts.map