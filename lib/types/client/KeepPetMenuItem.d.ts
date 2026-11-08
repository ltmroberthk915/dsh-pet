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
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { KeepStore } from './keep-store.ts';
import { NS } from './locales.ts';
/** Injected share the client apply body hands each row instance. */
export interface KeepPetMenuInjected {
    /** Mirror of the host's kept conversation ids. */
    keepStore: KeepStore;
    /** Read the host once when no state poll has answered yet. */
    ensureKeepLoaded: () => void;
    /** Persist one toggle; the host answers with the whole kept list. */
    setSessionKeep: (sessionId: string, keep: boolean) => void;
}
/**
 * Props of one row: the slot's owner share (the conversation), the menu's
 * bound open-state hook, the locale seat, and this entry's injected share.
 */
export interface KeepPetMenuProps extends KeepPetMenuInjected {
    sessionId?: string;
    displayTitle?: string;
    useMenuOpenState?: () => readonly [boolean, (open: boolean) => void];
    t?: TranslateNS<typeof NS>;
}
/**
 * One menu row: toggles the conversation's keep flag. The label names the
 * action (keep / release), matching the host pin row's toggle pattern.
 */
export declare function KeepPetMenuItem(props: KeepPetMenuProps): import("react").JSX.Element;
//# sourceMappingURL=KeepPetMenuItem.d.ts.map