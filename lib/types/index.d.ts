/**
 * dsh-pet host half — mounts the pet service and its HTTP routes. The
 * browser half (the './client' entry) renders the selected pet and drives it
 * through the same-origin '/api/pet/*' JSON endpoints plus the '/pet/<id>/*'
 * media route. The host builds the multi-pet registry once at startup from
 * the package assets, the hatch-pet custom pets directory, and composed
 * config entries; adding a pet means dropping a manifest + atlas into one of
 * those sources, never touching host or client code. Install via
 * 'dsh plugin --profile web add link:<dsh-web>/packages/dsh-pet'; the
 * cordis.patch.yml inserts this plugin row.
 * @module dsh-pet-copilot
 */
import { Context, type Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type PetConfig, type PetSettingsSection } from './service.ts';
import { type PetDisplayConfig } from './persist.ts';
export { PetService, MAX_SESSION_BUBBLES } from './service.ts';
export type { PetConfig, PetInteractResult, PetSettingsSection, PetSessionView, PetStateView, } from './service.ts';
export { AFFINITY_MAX, AFFINITY_RANKS, applyInteraction, applyTurnReward, emptyAffinity, rankOf, } from './affinity.ts';
export type { AffinityConfig, AffinityState, InteractionOutcome, PetInteraction, } from './affinity.ts';
export { animationForPhase, PetStateMachine, rowOf, } from './state.ts';
export type { ActivityPhase, PetAnimation, PetStateConfig, PetStateInput, PetStateSnapshot, } from './state.ts';
export { consumeTreat, defaultTreatConfig, emptyTreatLedger, settleTreatGrants, } from './treats.ts';
export type { TreatConfig, TreatLedger, TreatSettlement } from './treats.ts';
export { BUILTIN_REMARKS, REMARK_KINDS, REMARK_LINE_MAX, REMARK_LINES_MAX, RemarkPicker, builtinRemark, normalizePetRemarks, } from './remarks.ts';
export type { PetRemarks, PetRemarksManifest, RemarkKind } from './remarks.ts';
export { DEFAULT_PET_ID, DEFAULT_PET_NAME, PET_NAME_MAX_LENGTH, defaultDisplayConfig, emptyPersist, loadPetPersist, petHomeDir, savePetPersist, } from './persist.ts';
export type { PetDisplayConfig, PetPersist } from './persist.ts';
export { DEFAULT_FRAME_COUNTS, DEFAULT_PET_CELL, DEFAULT_PET_COLUMNS, DEFAULT_PET_ROW_COUNT, DEFAULT_TRACK_PATTERNS, PET_ROW_ORDER, codexPetsDir, loadPetRegistry, petEntryView, petPackageRoot, resolvePetManifest, } from './registry.ts';
export type { PetDefinition, PetEntry, PetManifest, PetRegistry, PetRegistryOptions, PetTrackDef, PetTrackOverride, } from './registry.ts';
export { makePetRoutes, PET_API_PREFIX, PET_ASSET_PREFIX, } from './routes.ts';
/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
export declare const name = "pet";
/** Services required before the pet can mount its surfaces. */
export declare const inject: string[];
/**
 * Defaults of the fields the pet's settings page edits. They are the schema
 * defaults of the pet row's own config, i.e. what a field the profile entry
 * never set resolves to.
 */
export declare const PET_FORM_DEFAULTS: {
    readonly visible: true;
    readonly size: 160;
    readonly right: 24;
    readonly bottom: 20;
    readonly bubbleScale: 1;
    readonly animationFps: 12;
    readonly animationMode: "fixed";
    readonly animationTickSlope: number;
    readonly animationTickIntercept: 6;
    readonly desktopEnabled: true;
    readonly multiPetEnabled: false;
    readonly hoverPanelEnabled: false;
    readonly petId: "whale-girl";
    readonly enabled: true;
    readonly decorationEnabled: true;
};
/**
 * One settings field as the config carries it. The Host commits an edit into
 * the running config through a live reference rather than remounting the row,
 * so a field usually arrives as that reference; a plain value appears when the
 * plugin runs outside a Loader (tests, direct mounts).
 */
export type LiveField<T> = Volatile<T> | T;
/** The pet's settings fields, as a profile entry's config declares them. */
export interface PetFormConfig {
    /** Master switch for the plugin (browser half + host routes). */
    enabled?: LiveField<boolean>;
    /** Status-decoration master switch (pet-center M5, #567); defaults to on. */
    decorationEnabled?: LiveField<boolean>;
    /** Master switch for the pet surface. */
    visible?: LiveField<boolean>;
    /** Scale of the rendered pet in px (sprite cell height). */
    size?: LiveField<number>;
    /** Horizontal inset from the viewport right edge, px. */
    right?: LiveField<number>;
    /** Vertical inset from the viewport bottom edge, px. */
    bottom?: LiveField<number>;
    /** Bubble typography multiplier on the automatic size following (#1549). */
    bubbleScale?: LiveField<number>;
    animationFps?: LiveField<number>;
    animationMode?: LiveField<'fixed' | 'native' | 'tick'>;
    animationTickSlope?: LiveField<number>;
    animationTickIntercept?: LiveField<number>;
    desktopEnabled?: LiveField<boolean>;
    multiPetEnabled?: LiveField<boolean>;
    hoverPanelEnabled?: LiveField<boolean>;
    /** Selected pet id (a registry entry; the service clamps stale values). */
    petId?: LiveField<string | undefined>;
}
/**
 * Plugin configuration. Under the 0.1.7 settings model a plugin's own Cordis
 * Config IS its settings page: the Host derives one form per profile entry
 * from this schema, so the fields the pet card edits live here with the
 * defaults the card inherits, next to the tuning block a profile may still
 * declare.
 *
 * Every page field is `volatile()` on purpose. The Host serves exactly the
 * volatile fields of a Config and refuses writes to any other path, and a
 * volatile field is the one it can commit into the RUNNING config: the pet
 * reads the edited value from the live reference instead of being remounted
 * for each edit (see `syncSettings` in `apply`). petId stays a plain string
 * because the service clamps the value against the registry, so a stored
 * selection naming a removed pet cannot invalidate the entry.
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    visible: z<boolean, boolean, "volatile-defined">;
    size: z<number, number, "volatile-defined">;
    right: z<number, number, "volatile-defined">;
    bottom: z<number, number, "volatile-defined">;
    bubbleScale: z<number, number, "volatile-defined">;
    animationFps: z<number, number, "volatile-defined">;
    animationMode: z<"fixed" | "native" | "tick", "fixed" | "native" | "tick", "volatile-defined">;
    animationTickSlope: z<number, number, "volatile-defined">;
    animationTickIntercept: z<number, number, "volatile-defined">;
    desktopEnabled: z<boolean, boolean, "volatile-defined">;
    multiPetEnabled: z<boolean, boolean, "volatile-defined">;
    hoverPanelEnabled: z<boolean, boolean, "volatile-defined">;
    petId: z<string, string, "volatile">;
    enabled: z<boolean, boolean, "volatile-defined">;
    decorationEnabled: z<boolean, boolean, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    visible: z<boolean, boolean, "volatile-defined">;
    size: z<number, number, "volatile-defined">;
    right: z<number, number, "volatile-defined">;
    bottom: z<number, number, "volatile-defined">;
    bubbleScale: z<number, number, "volatile-defined">;
    animationFps: z<number, number, "volatile-defined">;
    animationMode: z<"fixed" | "native" | "tick", "fixed" | "native" | "tick", "volatile-defined">;
    animationTickSlope: z<number, number, "volatile-defined">;
    animationTickIntercept: z<number, number, "volatile-defined">;
    desktopEnabled: z<boolean, boolean, "volatile-defined">;
    multiPetEnabled: z<boolean, boolean, "volatile-defined">;
    hoverPanelEnabled: z<boolean, boolean, "volatile-defined">;
    petId: z<string, string, "volatile">;
    enabled: z<boolean, boolean, "volatile-defined">;
    decorationEnabled: z<boolean, boolean, "volatile-defined">;
}>>, "plain">;
/**
 * The settings section the pet runs with: the effective values of the row's
 * own config. `fallbackPetId` covers a mount whose config names no pet at all
 * (a direct mount outside a Loader) — under a Loader the schema default is
 * always present, so the persisted selection stands whenever the config
 * carries it. `persisted` and `committed` give the display fields the same
 * treatment; see {@link displayField}.
 * @param config - the effective config of the pet row.
 * @param fallbackPetId - pet id to use when the config names none.
 * @param persisted - the display the pet already shows (its own `pet.json`).
 * @param committed - the profile layer's explicit display values, when known.
 * @returns the resolved settings section.
 */
export declare function petSettingsSection(config: PetFormConfig, fallbackPetId: string, persisted?: Partial<PetDisplayConfig>, committed?: Partial<PetDisplayConfig>): PetSettingsSection;
/** Register the pet service and its API + asset routes on the context. */
export declare const apply: typeof applyImpl;
/** Plugin config: the tuning block a profile may declare plus the pet's settings fields. */
export type PetPluginConfig = Omit<PetConfig, 'enabled' | 'decorationEnabled'> & PetFormConfig;
declare function applyImpl(ctx: Context, config?: PetPluginConfig): void;
declare module '@deepseek-ai/cordis' {
    interface Events {
        /**
         * Volatile config values were committed into the running fiber without a
         * remount; dispatched to the owning fiber only. Declared by the Loader and
         * restated here because this package carries no dependency on its types.
         */
        'loader/volatile-update'(paths: readonly (readonly string[])[]): void;
    }
}
//# sourceMappingURL=index.d.ts.map