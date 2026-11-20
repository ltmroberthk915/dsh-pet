/**
 * Browser-side keep set for the conversation row menu ("对话专宠"). The
 * host owns the durable flag; this store only mirrors it so an open menu row
 * renders the right label immediately and a paid toggle updates every row
 * without waiting for the next state poll. The pet's own care panel reads the
 * same snapshot straight from the state view (see keepTargetId/sessionKept),
 * because each sprite already re-renders on every poll.
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
export function keepTargetId(view) {
    if (view === null || view === undefined || view.keepable === false)
        return undefined;
    const id = view.sessionId !== undefined && view.sessionId !== '' ? view.sessionId : view.currentSessionId;
    return typeof id === 'string' && id !== '' ? id : undefined;
}
/**
 * Whether one conversation's pet is kept ("对话专宠"), as the host reports it
 * in the state snapshot. The host owns the durable flag; the panel only reads.
 * @param view - the state snapshot the sprite renders.
 * @param sessionId - the conversation the sprite stands for.
 * @returns true when that conversation's pet is kept.
 */
export function sessionKept(view, sessionId) {
    return sessionId !== undefined && view?.keptSessions?.includes(sessionId) === true;
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
