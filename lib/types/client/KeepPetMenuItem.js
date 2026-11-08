import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useEffect, useSyncExternalStore } from 'react';
import styles from './session-keep.module.css';
/** Fallback when the slot contract did not bind the menu hook (tests/direct mounts). */
const CLOSED_MENU = [false, () => { }];
function useNoMenuOpenState() {
    return CLOSED_MENU;
}
/** Paw glyph; a filled paw reads as "kept", an outline as "not kept". */
function PawIcon({ filled }) {
    return (_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 16 16", "aria-hidden": "true", fill: filled ? 'currentColor' : 'none', stroke: filled ? 'none' : 'currentColor', strokeWidth: filled ? 0 : 1.1, strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("ellipse", { cx: "4.1", cy: "6.1", rx: "1.4", ry: "1.75" }), _jsx("ellipse", { cx: "7.4", cy: "4.5", rx: "1.4", ry: "1.8" }), _jsx("ellipse", { cx: "10.8", cy: "5.2", rx: "1.4", ry: "1.8" }), _jsx("ellipse", { cx: "13.1", cy: "8.1", rx: "1.2", ry: "1.5", transform: "rotate(24 13.1 8.1)" }), _jsx("path", { d: "M4.9 11.6c.3-2 2.2-3.4 3.9-3.4s3.6 1.4 3.9 3.4c.2 1.4-.7 2.3-1.9 2.1-.9-.2-1.4-.5-2-.5s-1.1.3-2 .5c-1.2.2-2.1-.7-1.9-2.1Z" })] }));
}
/**
 * One menu row: toggles the conversation's keep flag. The label names the
 * action (keep / release), matching the host pin row's toggle pattern.
 */
export function KeepPetMenuItem(props) {
    const { sessionId, displayTitle, keepStore } = props;
    const state = useSyncExternalStore(keepStore.subscribe, keepStore.getSnapshot);
    const menuHook = props.useMenuOpenState ?? useNoMenuOpenState;
    const menu = menuHook();
    const closeMenu = () => {
        try {
            menu[1](false);
        }
        catch {
            // The menu may already be gone (Escape, outside click); keep toggling.
        }
    };
    useEffect(() => {
        props.ensureKeepLoaded();
    }, [props.ensureKeepLoaded]);
    const translate = props.t ?? ((key) => key);
    const disabled = typeof sessionId !== 'string' || sessionId.length === 0;
    const kept = !disabled && state.kept.has(sessionId);
    const label = translate(kept ? 'pet.menu.unkeep' : 'pet.menu.keep');
    const title = disabled
        ? label
        : `${label} — ${typeof displayTitle === 'string' && displayTitle.length > 0 ? displayTitle : sessionId}`;
    const onSelect = (event) => {
        event.preventDefault?.();
        event.stopPropagation?.();
        closeMenu();
        if (disabled)
            return;
        props.setSessionKeep(sessionId, !kept);
    };
    return (_jsx("div", { className: styles.row, children: _jsxs("button", { type: "button", role: "menuitem", className: styles.item, disabled: disabled, title: title, "aria-label": label, "aria-pressed": kept, "data-dsh-part": "pet-session-keep", onClick: onSelect, children: [_jsx("span", { className: kept ? `${styles.icon} ${styles.iconActive}` : styles.icon, "aria-hidden": "true", children: _jsx(PawIcon, { filled: kept }) }), _jsx("span", { className: styles.label, children: label }), kept && _jsx("span", { className: styles.check, "aria-hidden": "true", children: "\u2713" })] }) }));
}
