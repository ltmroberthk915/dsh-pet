/**
 * dsh-pet browser half — mounts the selected pet as a global floating
 * surface and drives it from the host's same-origin '/api/pet/*' JSON
 * endpoints: fetch the registry list once, poll the host snapshot (~1 s),
 * forward interactions, persist drag positions. The pet is host-global (no
 * session dimension), so it mounts directly onto 'document.body' via a
 * single React root — the [data-dsh-plugin="pet"] container — rather than a
 * session-scoped slot: on the new-conversation screen no session exists, and
 * a dock-mounted pet would vanish there (issue #48). The sprite chrome
 * portals into that same root, so the root owns the whole surface and a
 * root-keyed suppressor can hide it as one unit. When the pet is hidden the
 * entry becomes a fixed-position summon button.
 * @module @ltmroberthk915/dsh-pet/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
/** Required services (sessions powers bubble-to-session navigation). */
export declare const inject: string[];
/** Re-exported for consumers that type against the injected face. */
export type { PetInjected, PetDockEntryProps } from './PetDockEntry.tsx';
export type { PetSpriteProps } from './PetSprite.tsx';
export type { PetUiState, PetFeedback } from './pet-store.ts';
export type { PetSettingsCardFace, PetSettingsCardState } from './PetSettingsCard.tsx';
export type { PetSettingsSectionProps } from './PetSettingsCard.tsx';
export type { PetDefinition } from '../registry.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /**
         * Optional family binder provided by dsh-web-settings; absent when that
         * group plugin is not installed, so callers fall back to the shared
         * per-entry form.
         */
        webUiSettings?: {
            bind<S>(spec: {
                namespace: string;
                decode?: (section: unknown) => S | undefined;
            }): ConfigForm<S>;
        };
    }
}
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map