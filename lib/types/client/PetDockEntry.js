import { jsx as _jsx } from "react/jsx-runtime";
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
 * @module dsh-pet-copilot/client/PetDockEntry
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { PetSprite } from "./PetSprite.js";
import { PetRendererSwitch } from "./renderers/PetRendererSwitch.js";
import { createDragStream } from "./drag-stream.js";
import { GameplayHud } from "./gameplay-hud.js";
import styles from './pet.module.css';
const DEFAULT_DISPLAY = { visible: true, size: 160, right: 24, bottom: 20, bubbleScale: 1 };
/**
 * Dock entry: while the pet is visible, mount the floating PetSprite (it
 * portals itself onto document.body); while hidden, render the summon
 * button so the pet can always come back. The store is the plugin-owned
 * single instance — the slot system provides none because the pet is
 * host-global, not session-scoped.
 */
export function PetDockEntry(props) {
    const { store, ensure } = props;
    const ui = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const snapshot = ui.snapshot;
    const feedback = ui.feedback;
    const definition = ui.pets.find(entry => entry.id === snapshot?.pet.id) ?? null;
    const visible = snapshot?.display.visible ?? true;
    useEffect(() => {
        ensure();
    }, [ensure]);
    // Per-pet gameplay wiring: the coordination bus (HUD taps <-> chrome,
    // HUD track overrides <-> frames2d mount) and the shared drag stream.
    const auxRef = useRef(null);
    if (definition !== null && (auxRef.current === null || auxRef.current.id !== definition.id)) {
        auxRef.current = { id: definition.id, bus: {}, drag: createDragStream() };
    }
    const aux = auxRef.current;
    const gameplay = definition?.gameplay;
    if (visible) {
        return (_jsx("span", { "data-pet-dock": true, "data-testid": "pet-dock", children: snapshot === null || definition === null
                ? null
                : (_jsx(PetRendererSwitch, { definition: definition, phase: snapshot?.phase ?? 'idle', onPet: props.pet, ...(aux === null ? {} : { drag: aux.drag, bus: aux.bus }), t: props.t, children: _jsx(PetSprite, { snapshot: snapshot, definition: definition, display: snapshot.display, feedback: feedback, onPet: props.pet, onFeed: props.feed, onHide: props.hide, onDragEnd: props.dragEnd, onRename: props.rename, onOpenSession: props.openSession, onFeedbackDone: props.feedbackDone, portalTarget: props.portalTarget, dragDisabled: snapshot.gameplay?.mode === 'work', ...(aux === null ? {} : { bus: aux.bus }), ...(gameplay === undefined || aux === null
                            ? {}
                            : {
                                onGameplayTap: (fx, fy) => aux.bus.tap?.(fx, fy),
                                onGameplayMenu: () => aux.bus.openCard?.(),
                                hud: (_jsx(GameplayHud, { definition: definition, store: store, api: props.gameplay, bus: aux.bus, drag: aux.drag, t: props.t })),
                            }), t: props.t }) })) }));
    }
    const display = snapshot?.display ?? DEFAULT_DISPLAY;
    return (_jsx("button", { type: "button", className: styles.summon, style: {
            position: 'fixed',
            right: display.right,
            bottom: display.bottom,
            zIndex: 2147483000,
        }, onClick: props.summon, "data-testid": "pet-summon", "data-dsh-part": "summon-button", children: props.t('pet.summon', { name: snapshot?.name ?? '' }) }));
}
