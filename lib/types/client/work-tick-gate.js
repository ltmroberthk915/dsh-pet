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
export const DEFAULT_WORK_TICK_MS = 10_000;
/** Manifest bounds for `gameplay.work.tickMs` (src/gameplay.ts). */
const MIN_WORK_TICK_MS = 1_000;
const MAX_WORK_TICK_MS = 60_000;
/**
 * The gate window for one pet: its configured cadence, clamped to the manifest's
 * own bounds so a malformed registry entry cannot disable or flood the gate.
 * @param tickMs - the active definition's `gameplay.work.tickMs`, when it has one.
 * @returns the window in milliseconds.
 */
export function workTickWindowMs(tickMs) {
    if (typeof tickMs !== 'number' || !Number.isFinite(tickMs))
        return DEFAULT_WORK_TICK_MS;
    return Math.min(MAX_WORK_TICK_MS, Math.max(MIN_WORK_TICK_MS, tickMs));
}
/**
 * Create a gate.
 * @param now - the clock, injectable so tests control the window.
 * @returns the gate over that clock.
 */
export function createWorkTickGate(now = Date.now) {
    let lastAdjudicatedAt = 0;
    return {
        allow: (tickMs) => {
            const at = now();
            if (at - lastAdjudicatedAt < workTickWindowMs(tickMs))
                return false;
            lastAdjudicatedAt = at;
            return true;
        },
        reset: () => {
            lastAdjudicatedAt = 0;
        },
    };
}
