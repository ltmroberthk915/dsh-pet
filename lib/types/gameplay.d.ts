/**
 * Pet gameplay — the optional manifest 'gameplay' block and its host engine.
 * The block layers an opt-in mini-game over any frames2d pet: decaying stat
 * bars, currencies, a weighted idle director, touch zones, a work loop, a
 * sleep loop, passive income and a shop (issue: miku-pet generalization).
 *
 * Discipline split matches manifest-v2: STRUCTURE is fail-closed (types,
 * ranges, references into stats/tracks); the host engine is pure — every
 * verb takes an explicit clock and rng so tests stay deterministic. Decay,
 * passive income and sleep restore are lazy-settled on read (the treats.ts
 * discipline): the host runs no timers for gameplay.
 * @module @ltmroberthk915/dsh-pet/gameplay
 */
/** One roam direction the pet may walk in. */
export type PetRoamDirection = 'up' | 'down' | 'left' | 'right';
/** Every roam direction, in roll order (equal chance each unless restricted). */
export declare const PET_ROAM_DIRECTIONS: readonly PetRoamDirection[];
/** One gameplay effect: add amount to a declared stat or a currency. */
export interface PetGameplayEffect {
    stat?: string;
    currency?: string;
    amount: number;
}
/** One roll branch inside a touch zone; uncovered roll mass is a no-op. */
export interface PetGameplayTouchBranch {
    probability: number;
    effects?: PetGameplayEffect[];
    /** Track played on hit (held for stateMs, then the renderer settles). */
    state?: string;
    stateMs?: number;
    /** Bubble phrase pool; one is picked on hit. */
    phrases?: string[];
}
export interface PetGameplayTouchZone {
    name: string;
    /** Vertical slice of the hit box (fractions, y0 < y1). */
    y0: number;
    y1: number;
    branches: PetGameplayTouchBranch[];
}
export interface PetGameplayStatDef {
    max: number;
    initial?: number;
    decayPerMinute?: number;
    /** Decay rate while the work mode is active (defaults to decayPerMinute). */
    workingDecayPerMinute?: number;
    /** Extra decay rate while no session is active. */
    idleDecayPerMinute?: number;
}
export interface PetGameplayShopItem {
    id: string;
    label: string;
    /** Optional frame path (manifest-relative) shown as the item icon. */
    image?: string;
    price: number;
    currency: string;
    effects?: PetGameplayEffect[];
    lottery?: {
        effects?: PetGameplayEffect[];
        /** Default currency the prize is paid in (tiers may override). */
        currency?: string;
        tiers: {
            probability: number;
            prize: number;
            currency?: string;
        }[];
    };
}
/**
 * One extra named gameplay mode beyond work/sleep (a bath, a play session…).
 * The host holds `state` while the mode is active and may restore a stat on
 * a fixed cadence — the same lazy-settle rule the sleep mode uses. A mode is
 * pure data: adding one to a manifest needs no host change.
 */
export interface PetGameplayModeDef {
    /** frames2d track held for as long as the mode is active. */
    state: string;
    /** Action-button label (plain text); falls back to the i18n key pet.gameplay.<name>. */
    label?: string;
    /** Label while the mode is active (plain text); falls back to `label`. */
    activeLabel?: string;
    /** Periodic stat restore while the mode is active (omitted = no restore). */
    restore?: {
        stat: string;
        amount: number;
        intervalMs: number;
    };
}
/** The validated manifest 'gameplay' block. */
export interface PetGameplayManifest {
    idleDirector?: {
        intervalMs: number;
        maxMiss: number;
        idleWeight: number;
        acts: {
            track: string;
            weight: number;
            phrases?: string[];
        }[];
    };
    stats?: Record<string, PetGameplayStatDef>;
    /** Click hit box inside the sprite box (fractions). */
    hitBox?: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
    touch?: {
        zones: PetGameplayTouchZone[];
        /** Plain-click effect while a touch animation holds (miku: mood +0..3). */
        clickBoost?: {
            stat: string;
            min: number;
            max: number;
        };
    };
    work?: {
        state: string;
        successState: string;
        failState: string;
        tickMs: number;
        /** Hold time of the result track before the next round. */
        resultMs?: {
            success: number;
            fail: number;
        };
        successProbability: number;
        success?: {
            effects: PetGameplayEffect[];
        };
        fail?: {
            effects: PetGameplayEffect[];
        };
    };
    sleep?: {
        state: string;
        wakeState?: string;
        restore: {
            stat: string;
            amount: number;
            intervalMs: number;
        };
    };
    /**
     * Extra named modes beyond work/sleep, keyed by a kebab mode id. Each one
     * gets its own menu button, holds its track while active and may restore a
     * stat on a cadence. 'work' and 'sleep' are reserved keys.
     */
    modes?: Record<string, PetGameplayModeDef>;
    /**
     * Random roaming: on a slow interval the pet rolls whether to wander and
     * walks to a new spot on screen with `state` held for the travel time. The
     * chrome owns the motion (clamped to the viewport) and persists the resting
     * spot the way a drag does; the roll only runs while the pet is idle and no
     * mode, drag or touch animation owns it.
     */
    roam?: {
        /** frames2d track held while walking. */
        state: string;
        /** Ms between roam decisions. */
        intervalMs: number;
        /** Chance one decision actually walks (0, 1]. */
        probability: number;
        /** Travel per roam in px (distanceMin <= distanceMax). */
        distanceMin: number;
        distanceMax: number;
        /** Walking speed in px per second. */
        speed: number;
        /**
         * Directions the pet may walk in, rolled uniformly (equal chance each).
         * Omitted = all four. A side-view crawl reads best walking left/right, so
         * a pet may restrict the list to those two.
         */
        directions?: PetRoamDirection[];
    };
    passiveIncome?: {
        currency: string;
        amount: number;
        intervalMs: number;
    };
    shop?: {
        state?: string;
        items: PetGameplayShopItem[];
    };
    /** Track played while the chrome reports dragging (default 'drag'). */
    dragState?: string;
    /** Track played once when a drag ends (miku: standup), before settling. */
    dragEndState?: string;
}
export interface GameplayParseHooks {
    /** State names the renderer can play (frames2d track ids). */
    stateNames: ReadonlySet<string>;
    error: (message: string) => void;
}
/**
 * Validate the manifest 'gameplay' block (fail-closed). Only frames2d pets
 * may declare gameplay today: every state reference checks against the
 * declared track names.
 */
export declare function parseGameplayManifest(raw: unknown, hooks: GameplayParseHooks): PetGameplayManifest | undefined;
/** Persisted per-pet gameplay state (pet.json 'gameplay' map values). */
export interface PetGameplayState {
    stats: Record<string, number>;
    currencies: Record<string, number>;
    /** Active gameplay mode id ('work' | 'sleep' | a declared extra mode) or null. */
    mode: string | null;
    /** Epoch ms of the last lazy settle. */
    settledAt: number;
    /** Accumulated remainder ms towards the next passive income tick. */
    incomeCarryMs?: number;
    /** Accumulated remainder ms towards the next mode restore tick. */
    restoreCarryMs?: number;
}
/** Every mode the menu offers, in manifest order (sleep first, then extras). */
export declare function declaredModes(manifest: PetGameplayManifest): string[];
/**
 * The frames2d track one active mode holds. 'work' is owned by the work loop
 * (its state, result and fallback are its own), so it resolves to undefined.
 */
export declare function modeStateOf(manifest: PetGameplayManifest, mode: string): string | undefined;
/** The restore rule of one active mode, when it declares one. */
export declare function modeRestoreOf(manifest: PetGameplayManifest, mode: string | null): {
    stat: string;
    amount: number;
    intervalMs: number;
} | undefined;
/** Whether the manifest still declares this gameplay mode id. */
export declare function isDeclaredMode(manifest: PetGameplayManifest, mode: string): boolean;
/** Fresh state for one pet: stats at their initial (default max), no currency. */
export declare function initialGameplayState(manifest: PetGameplayManifest, now: number): PetGameplayState;
/** Clamp one stat value into [0, max]; currencies into [0, CURRENCY_MAX]. */
export declare function clampGameplay(state: PetGameplayState, manifest: PetGameplayManifest): void;
/**
 * Lazy settle: apply stat decay, passive income and the active mode's restore
 * rule (sleep restores energy, a declared extra mode restores whatever it
 * declares) for the elapsed wall time since the last settle. Mirrors the
 * treats.ts discipline (no host timers; read paths settle). Returns whether
 * anything changed.
 */
export declare function settleGameplay(state: PetGameplayState, manifest: PetGameplayManifest, now: number, options: {
    sessionActive: boolean;
}): boolean;
/** Apply one effect vector (touch/work/shop), clamped. */
export declare function applyGameplayEffects(state: PetGameplayState, manifest: PetGameplayManifest, effects: readonly PetGameplayEffect[]): void;
/** Roll one touch zone branch; undefined when the roll lands in no-op mass. */
export declare function rollTouchBranch(zone: PetGameplayTouchZone, rng: () => number): PetGameplayTouchBranch | undefined;
/** Roll one work tick outcome. */
export declare function rollWorkOutcome(work: NonNullable<PetGameplayManifest['work']>, rng: () => number): 'success' | 'fail';
/** Draw one lottery prize tier; uncovered mass falls through to the last tier. */
export declare function drawLotteryTier(lottery: NonNullable<PetGameplayShopItem['lottery']>, rng: () => number): {
    probability: number;
    prize: number;
    currency?: string;
};
/** The zone one normalized hit-box point lands in, if any. */
export declare function touchZoneAt(touch: {
    zones: PetGameplayTouchZone[];
}, yFraction: number): PetGameplayTouchZone | undefined;
//# sourceMappingURL=gameplay.d.ts.map