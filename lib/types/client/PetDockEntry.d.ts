/**
 * Global floating pet entry. The pet is host-global (its state, display and
 * interactions live on '/api/pet/*' endpoints with no session dimension), so
 * it must not ride a session-scoped slot — on the new-conversation screen no
 * session exists to scope a slot by, and the pet would vanish (issue #48).
 * The client half therefore mounts this entry straight onto 'document.body'
 * (see index.ts): while visible it renders the floating PetSprite (a portal
 * into the plugin root, so the root owns the whole surface), while hidden it
 * renders a fixed-position summon button. Which sprite renders is decided by
 * the host snapshot's pet id resolved against the registry list — no per-pet
 * component exists.
 * @module @ltmroberthk915/dsh-pet/client/PetDockEntry
 */
import { type ReactElement } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { PetStoreInstance } from './pet-store.ts';
import { type GameplayApi } from './gameplay-hud.tsx';
import { NS } from './locales.ts';
/** Injected actions handed to the dock entry component. */
export interface PetInjected {
    /** The app-wide pet store instance (snapshot + registry list + feedback). */
    store: PetStoreInstance;
    /** Ensure the first snapshot (and registry list) is fetched (called on mount). */
    ensure: () => void;
    /** Pet the sprite (click). */
    pet: () => void;
    /** Feed the sprite. */
    feed: () => void;
    /** Hide the sprite. */
    hide: () => void;
    /** Summon the hidden sprite back. */
    summon: () => void;
    /** Persist a drag position. */
    dragEnd: (right: number, bottom: number) => void;
    /** Rename the selected pet (persisted by the host). */
    rename: (name: string) => void;
    /** Navigate the GUI to the session a bubble reports on. */
    openSession: (sessionId: string) => void;
    /** Clear the reaction bubble. */
    feedbackDone: () => void;
    /** Gameplay verb API (miku-pet generalization); wired but unused for pets without a gameplay block. */
    gameplay: GameplayApi;
}
/** Composed props of the global pet entry (locale + injected; no slot runtime share). */
export type PetDockEntryProps = PetInjected & PropsLocale<typeof NS> & {
    /**
     * DOM node the floating sprite chrome portals into. Defaults to
     * document.body; the plugin apply passes its [data-dsh-plugin="pet"]
     * root so root-keyed suppressors (the portrait mobile layer) and skins
     * own the whole pet surface as one unit.
     */
    portalTarget?: Element;
};
/**
 * Dock entry: while the pet is visible, mount the floating PetSprite (it
 * portals itself onto document.body); while hidden, render the summon
 * button so the pet can always come back. The store is the plugin-owned
 * single instance — the slot system provides none because the pet is
 * host-global, not session-scoped.
 */
export declare function PetDockEntry(props: PetDockEntryProps): ReactElement;
//# sourceMappingURL=PetDockEntry.d.ts.map