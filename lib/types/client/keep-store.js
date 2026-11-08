/**
 * Browser-side keep set for the conversation row menu ("专属宠物保持"). The
 * host owns the durable flag; this store only mirrors it so an open menu row
 * renders the right label immediately and a paid toggle updates every row
 * without waiting for the next state poll.
 * @module dsh-pets-multiworkers/client/keep-store
 */
/** Set equality, so an unchanged poll payload does not wake the menu row. */
function sameMembers(previous, next) {
    if (previous.size !== next.size)
        return false;
    for (const id of next)
        if (!previous.has(id))
            return false;
    return true;
}
/** Create the keep store (apply world only; one per client bundle instance). */
export function createKeepStore() {
    let snapshot = { loaded: false, kept: new Set() };
    const listeners = new Set();
    let loading = false;
    const publish = (next) => {
        snapshot = next;
        for (const listener of [...listeners]) {
            try {
                listener();
            }
            catch {
                // A broken subscriber must not stop the rest of the menu from updating.
            }
        }
    };
    const store = {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        setSessions: (ids) => {
            const kept = new Set(ids.filter(id => typeof id === 'string' && id !== ''));
            if (snapshot.loaded && sameMembers(snapshot.kept, kept))
                return;
            publish({ loaded: true, kept });
        },
        ensureLoaded: (load) => {
            if (snapshot.loaded || loading)
                return;
            loading = true;
            load().then((ids) => {
                loading = false;
                // A state poll may have landed first; it is authoritative and newer.
                if (!snapshot.loaded)
                    store.setSessions(ids);
            }, () => { loading = false; });
        },
    };
    return store;
}
