/**
 * The pet settings card: pet selection plus display layout, staged over the
 * 'pet' profile entry's own configuration (a plugin's settings ARE its Cordis
 * Config since 0.1.7, so the Host serves one form per profile entry).
 * Rendered as an always-open first-level settings page; the section wrapper
 * below mounts it as the content of the top-level 'settings.section' nav
 * entry. The petId choices come from the registry endpoint ('/api/pet/pets') —
 * the same list the sprite renders from — so the card carries no per-pet
 * knowledge.
 */
import type { ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import { type CardActions, type CardShell, type FieldState as CardFieldState } from './settings-form.ts';
import { type PetServiceStatus } from './pet-api.ts';
/** The pet's settings fields this card edits (the namespace's full schema). */
export interface PetSettings {
    /** Master switch for the plugin. */
    enabled?: boolean;
    /** Master switch. */
    visible?: boolean;
    /** Scale of the rendered pet in px (sprite cell height). */
    size?: number;
    /** Horizontal inset from the viewport right edge, px. */
    right?: number;
    /** Vertical inset from the viewport bottom edge, px. */
    bottom?: number;
    /** Bubble typography multiplier on the automatic size following (#1549). */
    bubbleScale?: number;
    /** Selected pet id (a registry entry). */
    petId?: string;
    /** Status-decoration master switch (pet-center M5, #567). */
    decorationEnabled?: boolean;
}
/** What the pet settings card renders. */
export interface PetSettingsCardState extends CardShell {
    serviceStatus: PetServiceStatus;
    /** The aggregate shell has no Host settings form; pet selection uses its own persisted API. */
    petSelectionFallback: boolean;
    /** Plugin master switch. */
    enabled: CardFieldState;
    /** Master switch. */
    visible: CardFieldState;
    /** Pet scale. */
    size: CardFieldState;
    /** Right inset. */
    right: CardFieldState;
    /** Bottom inset. */
    bottom: CardFieldState;
    /** Bubble typography multiplier. */
    bubbleScale: CardFieldState;
    /** Selected pet. */
    petId: CardFieldState;
    /** Status-decoration master switch. */
    decorationEnabled: CardFieldState;
    /** Pet choices (registry ids + display names), loaded from the host. */
    petChoices: readonly {
        value: string;
        label: string;
    }[];
}
/** The registration-side face the card's slot entry injects. */
export interface PetSettingsCardFace extends CardActions {
    hooks: {
        /** Card snapshot bound by the renderer as usePetSettingsCard. */
        petSettingsCard: SnapshotStore<PetSettingsCardState>;
    };
}
/** Bridges the 'pet' scope onto the card's staged form. */
export declare class PetSettingsCardController {
    private readonly form;
    private readonly store;
    private readonly petChoices;
    private readonly petLabels;
    private selectedPetId;
    private selectedVisible;
    private stagedPetId;
    private stagedVisible;
    private savingPet;
    private petSaveFailed;
    private loaded;
    private serviceStatus;
    private disposed;
    /** Pending deferred-load or retry timer; cancelled by dispose(). */
    private pendingTimer;
    /** @param scope - the bound configuration form for the 'pet' entry. */
    constructor(scope: ConfigForm<PetSettings>);
    /** Retry throughout installation/reload; retain drafts until a verified save. */
    private refreshService;
    private fallback;
    /**
     * The visibility the fallback switch renders: the staged draft when the user
     * moved it, the persisted value otherwise. There is no user layer to override
     * here, so the field is never marked overridden.
     */
    private fallbackVisible;
    /**
     * Persist the staged selection and visibility through the pet API — the only
     * writer available when the aggregate shell serves this card, since there is
     * no Host settings form to mutate — then confirm the read-back before the
     * drafts are cleared.
     */
    private saveFallback;
    private projection;
    /**
     * Build the face the card's slot registration injects.
     * @returns the card's snapshot and its form actions.
     */
    inject(): PetSettingsCardFace;
    /**
     * Release the card's scope subscription, bound stores and pending load
     * timers; the slot disposer calls this on teardown.
     */
    dispose(): void;
}
/** Props the renderer binds for the pet settings card. */
export type PetSettingsCardProps = PropsLocale<'pet'> & InjectFace<PetSettingsCardFace>;
/**
 * Render the pet settings card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card.
 */
export declare function PetSettingsCard(props: PetSettingsCardProps): import("react").JSX.Element;
/** Props the settings section binds for the pet card page. */
export type PetSettingsSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'pet'> & InjectFace<PetSettingsCardFace>;
/** Render the pet settings card as a first-level settings page. */
export declare function PetSettingsSection(props: PetSettingsSectionProps): ReactNode;
//# sourceMappingURL=PetSettingsCard.d.ts.map