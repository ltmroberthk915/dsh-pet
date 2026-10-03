/**
 * Page-wide work-tick gate for the pet's work mode. Hot reloads can leave
 * several GameplayHud instances alive, each running its own work interval;
 * without a shared gate every interval would call workTick and each stale call
 * re-rolls, re-grants treats and re-plays the success/fail track, so the
 * outcome appears to play several times per window. The gate accepts the first
 * adjudication of a window and silently suppresses the duplicates that follow.
 *
 * The window is the active pet's own `gameplay.work.tickMs`, not a constant: a
 * pet configured with a shorter cadence must actually adjudicate that often,
 * while a fixed window would downgrade it without saying so (#1494).
 * @module dsh-pet-copilot/client/work-tick-gate
 */
/** Window used when the active pet declares no work cadence. */
export declare const DEFAULT_WORK_TICK_MS = 10000;
/**
 * The gate window for one pet: its configured cadence, clamped to the manifest's
 * own bounds so a malformed registry entry cannot disable or flood the gate.
 * @param tickMs - the active definition's `gameplay.work.tickMs`, when it has one.
 * @returns the window in milliseconds.
 */
export declare function workTickWindowMs(tickMs: number | undefined): number;
/** The shared work-tick gate. */
export interface WorkTickGate {
    /**
     * Admit one adjudication for the current window.
     * @param tickMs - the active pet's configured work cadence.
     * @returns true when this call may adjudicate, false for a duplicate.
     */
    allow: (tickMs: number | undefined) => boolean;
    /** Forget the last adjudication (used when work mode is entered). */
    reset: () => void;
}
/**
 * Create a gate.
 * @param now - the clock, injectable so tests control the window.
 * @returns the gate over that clock.
 */
export declare function createWorkTickGate(now?: () => number): WorkTickGate;
//# sourceMappingURL=work-tick-gate.d.ts.map