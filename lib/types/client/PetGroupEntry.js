import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { PetDockEntry } from "./PetDockEntry.js";
import { createPetStore } from "./pet-store.js";
import { SECONDARY_PET_SCALE } from "../session-colors.js";
import { petRenderSize } from '../../desktop/pet-layout.js';
/** Embedded fallback uses the same conversation projections as desktop windows. */
export function PetGroupEntry(props) {
    const ui = useSyncExternalStore(props.store.subscribe, props.store.getSnapshot);
    // Gate the whole fallback tree. Remounting a session must not reset ownership
    // or restart an invisible second set of sprite animation timers.
    if (ui.desktopActive)
        return null;
    const snapshot = ui.snapshot;
    if (!snapshot?.display.multiPetEnabled || !snapshot.display.visible || !snapshot.companions?.length)
        return _jsx(PetDockEntry, { ...props });
    return _jsx(_Fragment, { children: snapshot.companions.map((companion, index) => _jsx(EmbeddedCompanion, { ...props, snapshot: snapshot, companion: companion, index: index }, companion.sessionId)) });
}
function EmbeddedCompanion(props) {
    const local = useMemo(() => createPetStore().create(), []);
    const ui = useSyncExternalStore(props.store.subscribe, props.store.getSnapshot);
    const position = useRef(undefined);
    const { snapshot, companion: c } = props;
    useEffect(() => {
        const size = c.primary ? snapshot.display.size : Math.max(20, Math.round(snapshot.display.size * SECONDARY_PET_SCALE));
        local.actions.setPets(ui.pets);
        local.actions.setFeedback(c.primary ? ui.feedback : null);
        local.actions.setSnapshot({ ...snapshot, ...c, companions: undefined,
            sessions: c.bubble ? [{ ...c, bubble: c.bubble }] : [], announcement: c.primary ? snapshot.announcement : undefined,
            display: { ...snapshot.display, size, ...(position.current ?? {
                    right: snapshot.display.right + (c.primary ? 0 : (props.index + 1) * (petRenderSize(snapshot.pet.id, size) + 20)), bottom: snapshot.display.bottom,
                }) } });
    }, [local, ui.pets, ui.feedback, snapshot, c, props.index]);
    return _jsx(PetDockEntry, { ...props, store: local, dragEnd: (right, bottom) => {
            position.current = { right, bottom };
            if (c.primary)
                props.dragEnd(right, bottom);
        } });
}
