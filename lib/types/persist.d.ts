import { type SessionColor } from './session-colors.ts';
import { type AnimationMode } from './animation.ts';
import { type AffinityState } from './affinity.ts';
import { type TreatLedger } from './treats.ts';
import type { PetGameplayState } from './gameplay.ts';
export { DEFAULT_PET_ID, DEFAULT_PET_NAME } from './defaults.ts';
/** Display configuration the user can tweak. */
export interface PetDisplayConfig {
    /** Master switch. */
    visible: boolean;
    /** Scale of the rendered pet in px (sprite cell height). */
    size: number;
    /** Horizontal inset from the viewport right edge, px. */
    right: number;
    /** Vertical inset from the viewport bottom edge, px. */
    bottom: number;
    /**
     * Multiplier on the bubble typography's automatic size following (#1549).
     * The rendered bubble scale is `size / 160 * bubbleScale`, bounded by
     * {@link BUBBLE_FONT_MIN_PX}..{@link BUBBLE_FONT_MAX_PX}, so 1 keeps the
     * 12px baseline the stylesheet was drawn for at the default 160px pet.
     */
    bubbleScale: number;
    animationFps?: number;
    animationMode?: AnimationMode;
    /** FPS = k × footer tok/s + b, clamped to 1–60 FPS. */
    animationTickSlope?: number;
    animationTickIntercept?: number;
    desktopEnabled?: boolean;
    multiPetEnabled?: boolean;
    /** Open the care panel on pointer hover; off by default to avoid interruptions. */
    hoverPanelEnabled?: boolean;
}
export declare const defaultDisplayConfig: PetDisplayConfig;
/** Display value bounds (shared by load-time validation and setConfig). */
export declare const DISPLAY_SIZE_MIN = 32;
export declare const DISPLAY_SIZE_MAX = 1024;
export declare const DISPLAY_INSET_MAX = 10000;
/** Bubble typography bounds (issue #1549). */
export declare const BUBBLE_SCALE_MIN = 0.5;
export declare const BUBBLE_SCALE_MAX = 2;
export declare const BUBBLE_SCALE_STEP = 0.05;
/** Pixel size the bubble stylesheet was drawn for, at the default pet size. */
export declare const BUBBLE_BASE_FONT_PX = 12;
/** Pet size that baseline matches; other sizes scale the bubble with them. */
export declare const BUBBLE_BASE_SIZE_PX = 160;
/** Readability floor and layout ceiling of the scaled bubble text. */
export declare const BUBBLE_FONT_MIN_PX = 10;
export declare const BUBBLE_FONT_MAX_PX = 24;
/**
 * Bubble typography scale for one display config (issue #1549): the bubble
 * follows the pet's own size so a shrunk pet does not carry a full-size
 * bubble, and the user's multiplier rides on top. The result is a CSS ratio
 * against {@link BUBBLE_BASE_FONT_PX}, bounded so the text never drops below
 * the readability floor or outgrows the pet. `bubbleScale` is optional at
 * runtime: a host that predates the field (a rolling update, or any snapshot
 * that omits it) falls back to the baseline, because a NaN ratio written into
 * `--pet-bubble-scale` collapses every bubble's text to zero.
 * @param display - display config; `bubbleScale` may be absent on older hosts.
 * @returns the ratio written to `--pet-bubble-scale` (always finite).
 */
export declare function bubbleScaleFor(display: Pick<PetDisplayConfig, 'size'> & {
    bubbleScale?: number;
}): number;
/** Everything persisted for the pet. */
export interface PetPersist {
    sessionColors?: Record<string, SessionColor>;
    /** Playback preferences belong to a character, not to the whole application. */
    playback?: Record<string, Pick<PetDisplayConfig, 'animationFps' | 'animationMode' | 'animationTickSlope' | 'animationTickIntercept'>>;
    /** Selected pet id (a registry entry; clamped at service startup). */
    petId: string;
    /**
     * Per-pet display names keyed by pet id. A pet without an entry falls back
     * to its manifest displayName, so only user renames are stored here.
     */
    names: Record<string, string>;
    /**
     * Per-pet selected frames2d skin id (keyed by pet id). Skin ids are manifest
     * data, so a stale entry (skin renamed or removed, pet swapped) is ignored
     * when the state view is built instead of pinning an unresolvable track.
     */
    skins: Record<string, string>;
    /** One shared total for every session pet, including feeds and cooldowns. */
    affinity: AffinityState;
    /** Shared treat (小鱼干) stock; session colors never create another balance. */
    treats: TreatLedger;
    display: PetDisplayConfig;
    /** Per-pet gameplay state (stats/currencies/mode), keyed by pet id. */
    gameplay: Record<string, PetGameplayState>;
}
/** Name constraints. */
export declare const PET_NAME_MAX_LENGTH = 20;
export declare function emptyPersist(): PetPersist;
/**
 * Resolve the persistence directory ($DSH_HOME or ~/.dsh). Delegates to the
 * shared {@link dshHome} resolution so the plugin family keeps one DSH_HOME
 * definition (env override, ~ expansion, cwd-joined relative values).
 */
export declare function petHomeDir(): string;
/** Load persisted state; missing or corrupt files fall back to defaults. */
export declare function loadPetPersist(dir?: string): PetPersist;
/** Atomically persist state (write temp + rename). */
export declare function savePetPersist(data: PetPersist, dir?: string): void;
//# sourceMappingURL=persist.d.ts.map