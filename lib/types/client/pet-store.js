/**
 * Browser-side pet store: the pet state snapshot plus transient UI feedback
 * (reaction bubbles), written only through the store's audit actions. The
 * RPC polling and interactions live in the plugin apply body; components
 * only ever read snapshots.
 * @module dsh-pet-copilot/client/pet-store
 */
import { defineStore } from '@deepseek-ai/dsh-client-store';
/** Create the pet store handle (apply world only; never module-level). */
export function createPetStore() {
    return defineStore({
        init: () => ({
            desktopActive: false,
            snapshot: null,
            pets: [],
            state: 'loading',
            error: null,
            feedback: null,
        }),
        actions: {
            setDesktopActive: (draft, active) => { draft.desktopActive = active; },
            setSnapshot: (draft, snapshot) => {
                // The 2 s poll republishes the full snapshot even while the pet is
                // idle. Skipping an unchanged payload keeps immer's produce at zero
                // modifications, so zustand never notifies and the whole sprite tree
                // skips the re-render. Equality is JSON-based and skip-only: both
                // sides come from the same host serializer, and any mismatch falls
                // through to the normal publish — the failure mode is one extra
                // render, never a stale pet.
                if (draft.state === 'ready' && draft.error === null && sameSnapshot(draft.snapshot, snapshot))
                    return;
                draft.snapshot = snapshot;
                draft.state = 'ready';
                draft.error = null;
            },
            setPets: (draft, pets) => {
                draft.pets = pets;
            },
            setState: (draft, state, error) => {
                draft.state = state;
                draft.error = error;
            },
            setFeedback: (draft, feedback) => {
                draft.feedback = feedback;
            },
            setGameplayView: (draft, view) => {
                if (draft.snapshot !== null)
                    draft.snapshot = { ...draft.snapshot, gameplay: view };
            },
        },
    });
}
/**
 * Content equality for consecutive poll snapshots. JSON compare, not field
 * enumeration: an exact string match is the only way to skip the publish, so
 * a missed field can never freeze the UI — it can only cost the render the
 * optimization exists to save.
 */
function sameSnapshot(previous, next) {
    return previous !== null && JSON.stringify(previous) === JSON.stringify(next);
}
