import { type AnimationMode } from './animation.ts';
/**
 * Pet host service — the `pet.*` RPC domain. A composition facade: it wires
 * the pure event projection (`event-projection`) onto the state machine,
 * delegates the affinity economy to the ledger (`ledger`), and routes
 * persistence through `persist`. The API gateway maps these methods onto
 * `pet.state` / `pet.pets` / `pet.interact` / `pet.setVisible` /
 * `pet.setConfig` / `pet.setName` / `pet.setPet` for browser consumers.
 *
 * Concurrent sessions each keep their own machine: the sprite animation
 * follows the most recent meaningful event (the display session) while the
 * state view carries one bubble per active session.
 * @module dsh-pet-copilot/service
 */
import { Context, Service } from '@deepseek-ai/cordis';
import type { DesktopStatus } from './desktop-status.ts';
import type { AffinityConfig, PetAffinityView, PetInteraction } from './affinity.ts';
import { type PetAnnouncement } from './announce.ts';
import type { TreatConfig } from './treats.ts';
import { type SessionColor } from './session-colors.ts';
import { type LedgerInteractionResult } from './ledger.ts';
import { type PetDisplayConfig } from './persist.ts';
import { type PetDefinition, type PetManifest, type PetRegistry, type PetRegistryDiagnostic } from './registry.ts';
import type { DecorationView } from './contracts/status-decoration.ts';
import { type PetStateConfig, type PetStateSnapshot, type PetMotion } from './state.ts';
/** Plugin configuration. */
export interface PetConfig {
    /** Affinity tuning. */
    affinity?: Partial<AffinityConfig>;
    /** State machine tuning. */
    state?: Partial<PetStateConfig>;
    /** Treat economy tuning. */
    treats?: Partial<TreatConfig>;
    /** Persistence directory override (defaults to $DSH_HOME). */
    persistDir?: string;
    /** Master switch for the plugin (browser half + host routes). */
    enabled?: boolean;
    /** Status-decoration master switch (pet-center M5, #567); defaults to on. */
    decorationEnabled?: boolean;
    /** Prebuilt registry (tests); defaults to scanning the package + user dirs. */
    registry?: PetRegistry;
    /** Extra manifest entries composed by the embedding application. */
    pets?: readonly PetManifest[];
}
/**
 * The pet's settings-namespace section: the pet selection and display fields
 * the web settings surface edits. `right`/`bottom` are also updated by drag
 * interactions, which keep the settings document in sync through the service.
 * Naming is per pet and lives outside the settings document (the hover-panel
 * rename targets the selected pet).
 */
export interface PetSettingsSection {
    /** Selected pet id (a registry entry; the service clamps stale values). */
    petId?: string;
    /** Master switch. */
    visible: boolean;
    /** Scale of the rendered pet in px (sprite cell height). */
    size: number;
    /** Horizontal inset from the viewport right edge, px. */
    right: number;
    /** Vertical inset from the viewport bottom edge, px. */
    bottom: number;
    /** Bubble typography multiplier (#1549); see PetDisplayConfig. */
    bubbleScale?: number;
    animationFps?: number;
    animationMode?: AnimationMode;
    animationTickSlope?: number;
    animationTickIntercept?: number;
    desktopEnabled?: boolean;
    multiPetEnabled?: boolean;
    hoverPanelEnabled?: boolean;
    /** Master switch for the plugin (browser half + host routes). */
    enabled?: boolean;
    /**
     * Status-decoration master switch (pet-center M5, #567). Defaults to on;
     * the settings surface mirrors this field and can turn it off.
     */
    decorationEnabled?: boolean;
}
/** Settings namespace of the pet capability. Spelled here rather than imported: the browser half spells the same value. */
export declare const PET_SETTINGS_NAMESPACE = "pet";
/**
 * One active TOP-LEVEL session as the pet displays it. Sessions run in
 * parallel, so each gets its own bubble while the sprite itself follows the
 * most recent meaningful event (the display session). Subagent children
 * report no bubble of their own: their work is already reflected by the
 * bubble of the conversation that spawned them, and the bubble buttons
 * navigate to GUI sessions, which subagents are not.
 */
export interface PetSessionView {
    /** Session identity (stringified for the wire; never exposed as a key). */
    sessionId: string;
    /** The animation this session's activity maps onto. */
    animation: PetStateSnapshot['animation'];
    /** This session's status bubble copy. */
    bubble: string;
    /** This session's raw activity phase. */
    phase: PetStateSnapshot['phase'];
    /** This session's fresh inner whisper (碎碎念), when one is within its TTL. */
    whisper?: string;
}
/** Hard cap on simultaneously displayed session bubbles (most recent first). */
export declare const MAX_SESSION_BUBBLES = 12;
/** One live conversation (or the sole main-window idle companion). */
export interface PetCompanionView extends PetMotion {
    sessionId: string;
    primary: boolean;
    /** Completion revision awaiting an explicit foreground-view acknowledgement. */
    awaitingView?: number;
    animation: PetStateSnapshot['animation'];
    phase: PetStateSnapshot['phase'];
    sessionActive: boolean;
    bubble?: string;
    whisper?: string;
    performance?: PetStateView['performance'];
    color: SessionColor;
}
/** Snapshot returned by `pet.state`. */
export interface PetStateView extends PetMotion {
    desktop?: DesktopStatus;
    primary?: boolean;
    awaitingView?: number;
    sessionId?: string;
    currentSessionId?: string;
    companions?: PetCompanionView[];
    color?: SessionColor;
    animation: PetStateSnapshot['animation'];
    bubble?: string;
    phase: PetStateSnapshot['phase'];
    sessionActive: boolean;
    /**
     * Per-session bubbles for every concurrently active TOP-LEVEL session:
     * the GUI's current session first when reported, the rest most recently
     * active first; optional so older hosts without the multi-session view
     * stay consumable. The single 'bubble' above mirrors the display session.
     */
    sessions?: PetSessionView[];
    /** Affinity ledger snapshot. */
    affinity: PetAffinityView;
    /** Display configuration. */
    performance?: {
        tokensPerSecond: number;
        source: 'sessionStats';
        sessionId: string;
    };
    display: PetDisplayConfig;
    /** The selected pet's registry identity. */
    pet: {
        /** Registry id. */
        id: string;
        /** Manifest display name (unrenamed default). */
        displayName: string;
        /** Manifest description. */
        description: string;
    };
    /** The selected pet's display name (user rename or manifest default). */
    name: string;
    /**
     * The selected frames2d skin id for this pet (absent = the pet's default
     * look). Persisted host-side, so a page reload or client restart restores
     * the user's last choice instead of falling back to the default look.
     */
    skin?: string;
    /** Treat (小鱼干) stock snapshot. */
    treats: {
        /** Stocked treats now. */
        stocked: number;
        /** Stock cap. */
        max: number;
    };
    /**
     * The active status decoration (pet-center M5, #567), when the master
     * switch is on and the default decoration entry exists. Absent means the
     * browser half renders no ornament.
     */
    decoration?: DecorationView;
    /**
     * The selected pet's gameplay view (miku-pet generalization), present
     * when the pet declares a gameplay block. Read-only projection: polling
     * settles the view in memory but never writes pet.json.
     */
    gameplay?: PetGameplayStateView;
    /**
     * The freshest plugin-authored announcement (dsh-usage linkage), within
     * its TTL; absent when none is fresh. Rendered as a dedicated styled
     * bubble above the session stack.
     */
    announcement?: PetAnnouncement;
}
/** Result of `pet.interact`. */
export type PetInteractResult = LedgerInteractionResult;
/** The gameplay slice of the state view (dynamic state only; defs ride the pet definition). */
export interface PetGameplayStateView {
    /** Stat values rounded for display. */
    stats: Record<string, number>;
    /** Active mode id ('work' | 'sleep' | a declared extra mode) or null. */
    mode: string | null;
}
/** Result of the gameplay verbs (touch / setMode / workTick / buy). */
export interface PetGameplayVerbResult {
    ok: boolean;
    error?: string;
    /** Touch: whether a branch hit, plus its presentation. */
    hit?: boolean;
    state?: string;
    stateMs?: number;
    phrase?: string;
    /** Work tick outcome. */
    outcome?: 'success' | 'fail';
    /** Shop purchase: the drawn prize, when the item was a lottery. */
    prize?: {
        amount: number;
        currency: string;
    };
    view?: PetGameplayStateView;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        pet: PetService;
    }
}
/**
 * Cordis service exposing the pet RPC domain. Lazy: nothing is scanned or
 * written until an economic event or interaction arrives; event listeners
 * update only in-memory state, and persistence happens on economic changes
 * (turn rewards, feeds, config/name changes) — never on a read.
 */
export declare class PetService extends Service {
    static inject: string[];
    private readonly machine;
    private readonly stateConfig;
    private readonly ledger;
    private readonly registry;
    private readonly persistDir;
    private enabled;
    /** Status-decoration master switch (M5, #567); mirrored from settings. */
    private decorationEnabled;
    /** The freshest plugin-authored announcement (dsh-usage linkage). */
    private announcement;
    private disposeActivity;
    /** Session whose most recent meaningful event currently drives the global pet. */
    private displaySession;
    /**
     * Effective voice-pack overrides for the currently selected pet (M4,
     * #677). Cached per pet id; the registry is an immutable snapshot, so the
     * global pack and each entry's pack cannot change behind the cache.
     */
    private voiceCache;
    /**
     * Per-session activity, most recent last (Map insertion order). Settled
     * records are pruned above 128; live conversations are never evicted by
     * the legacy bubble-stack cap. Disposed sessions are removed immediately.
     */
    private readonly sessionActivity;
    private activityRevision;
    /**
     * Sessions whose reward source is the official event stream. This metadata
     * outlives transient visual resets so a derived legacy `done` cannot reward
     * the same turn again after the pet is disabled and re-enabled.
     */
    private readonly officialEventSessions;
    /**
     * Resolve the settings namespace this plugin's own config is served as, when
     * the caller can read it off the composition. A plugin's settings ARE its own
     * config, so the namespace is the row's id — and an aggregate bundle renames
     * child rows (`pet` becomes `web-ui-pet`), which is why it cannot be assumed
     * to be {@link PET_SETTINGS_NAMESPACE}. `apply` sets this; absent means the
     * plugin runs outside a Loader and the package's own id stands.
     */
    settingsNamespaceProvider: (() => string | undefined) | undefined;
    constructor(ctx: Context, config?: PetConfig);
    /**
     * The draw-time voice-pool provider handed to every projection runtime.
     * It re-resolves when the selected pet changes, so live engines re-voice
     * on the next draw without being rebuilt (M4, #677).
     */
    private voicePools;
    /** Whether the pet service consumes session activity while enabled. */
    isEnabled(): boolean;
    /** RPC: current pet state snapshot. */
    state(currentSessionId?: string): Promise<PetStateView>;
    /** A foreground conversation was viewed; polling alone never acknowledges it. */
    markSessionViewed(sessionId: string, revision: number): Promise<{
        ok: true;
    }>;
    private awaitingView;
    /**
     * RPC: one plugin-authored announcement bubble (dsh-usage linkage). The
     * payload is validated into a bounded PetAnnouncement; a malformed one is
     * dropped silently — a sibling plugin's bug must never surface as pet
     * breakage. The announcement is in-memory only.
     */
    announce(input: unknown): {
        ok: boolean;
    };
    /** Current persisted display config (read-only view). */
    display(): PetDisplayConfig;
    /** RPC: the registry entries the browser half renders and selects from. */
    pets(): Promise<PetDefinition[]>;
    /** The loaded registry (the asset routes serve its entries). */
    registrySnapshot(): PetRegistry;
    /** RPC: structured registry diagnostics (pet-center M2, issue #623). */
    diagnostics(): Promise<{
        diagnostics: PetRegistryDiagnostic[];
    }>;
    /**
     * The active status decoration view (M5, #567): the default 'whale' entry
     * (user directories override built-ins by id), gated by the master switch.
     */
    private activeDecoration;
    /** The selected pet's registry entry. */
    activeEntry(): NonNullable<PetRegistry['entries'][number]>;
    /** Currently selected pet id (persisted). */
    selectedPetId(): string;
    /** The display name of one pet (user rename or manifest displayName). */
    petName(petId?: string): string;
    /** RPC: switch the selected pet (persisted, settings document mirrored). */
    setPetId(petId: string): Promise<{
        ok: true;
        petId: string;
    } | {
        ok: false;
        error: string;
    }>;
    /** Start or stop the session-activity listeners that drive the pet. */
    setEnabled(enabled: boolean): void;
    private syncActivity;
    /** Drop transient activity because terminal events missed while disabled cannot be replayed safely. */
    private resetActivity;
    /** Return the per-session activity record, creating it on first sight. */
    private activityOf;
    /**
     * Commit one activity: the session's own machine renders its bubble, and
     * the session becomes the host-global display session (most recent
     * meaningful event wins the sprite animation).
     */
    private applyActivity;
    /** RPC: pet or feed the pet. */
    interact(kind: PetInteraction): Promise<PetInteractResult>;
    /** The active pet's gameplay block, if it declares one. */
    private gameplayDef;
    /** The persisted (or fresh) gameplay state of the selected pet. */
    private gameplayState;
    /** Display view of one gameplay state (rounded stats; treats ride the shared treat ledger). */
    private gameplayViewOf;
    /**
     * Move gameplay 'treats' currency (the unified post-wallet currency) from
     * the engine's settle work area into the shared treat ledger, capped by
     * the stock cap. The engine keeps its generic currency record for settle
     * math; this drain is the only bridge to the wallet-free economy.
     */
    private drainGameplayTreats;
    /** Persist the mutated gameplay state of one verb call. */
    private commitGameplay;
    /**
     * RPC: a touch on the pet. 'zone' names a touch zone (roll a branch);
     * omitted means a plain click while a touch animation holds (clickBoost).
     */
    gameplayTouch(zone?: string): Promise<PetGameplayVerbResult>;
    /**
     * RPC: enter or leave a gameplay mode (null clears it). Every mode the
     * manifest declares is accepted: 'work', 'sleep', or one of the extra
     * 'modes' entries (a bath, a play session…).
     */
    gameplaySetMode(mode: string | null): Promise<PetGameplayVerbResult>;
    /** RPC: one work-round adjudication (only while the work mode holds). */
    gameplayWorkTick(): Promise<PetGameplayVerbResult>;
    /** RPC: buy one shop item (effects, currency swap, or a lottery draw). */
    gameplayBuy(itemId: string): Promise<PetGameplayVerbResult>;
    /** RPC: show or hide the pet. */
    setVisible(visible: boolean): Promise<{
        ok: true;
        display: PetDisplayConfig;
    }>;
    /**
     * The persisted skin for one entry, when the manifest still declares it: a
     * stale id (skin removed from the manifest, pet swapped) reads as "default"
     * rather than pinning a track the browser half cannot resolve.
     */
    private persistedSkin;
    /**
     * RPC: select the current pet's frames2d skin (`undefined` restores the
     * pet's default look). The choice is stored per pet, so every later state
     * view (reload, client restart, pet re-selection) serves it back.
     */
    setSkin(skin: string | undefined): Promise<{
        ok: true;
        skin?: string;
    } | {
        ok: false;
        error: string;
    }>;
    /** RPC: update display config (size / position / bubble scale). Pixel values are clamped to whole pixels. */
    setConfig(patch: Partial<PetDisplayConfig>, expectedPetId?: unknown): Promise<{
        ok: true;
        display: PetDisplayConfig;
    }>;
    /** RPC: rename the selected pet (trimmed, 1–20 chars, per-pet storage). */
    setName(name: string): Promise<{
        ok: true;
        name: string;
    } | {
        ok: false;
        error: string;
    }>;
    /**
     * Apply a committed settings section to the persisted selection and display
     * config. Called by the settings surface on every change; values are
     * clamped exactly like the setConfig RPC so both write paths converge.
     * @param section - the resolved settings section.
     */
    applySettingsSection(section: PetSettingsSection): void;
    /** Mirror the persisted display config into the settings document (best-effort). */
    private syncSettingsFromPet;
    /** Award the turn reward once per completed turn (idempotent per session + turn). */
    private rewardTurn;
    /** Preserve turn rewards for installations that only emit legacy activity. */
    private rewardLegacyTurn;
    private view;
    /** Reads the SAME durable projection as the footer. Never estimates tokens. */
    private footerPerformance;
    private sessionColor;
    private assignSessionColor;
    private flush;
}
//# sourceMappingURL=service.d.ts.map