export const DEFAULT_ANIMATION_FPS = 12;
export const MAX_ANIMATION_FPS = 60;
/** Hand-drawn companions need a readable gait, even with very fast models. */
export const MAX_COMPANION_FPS = 12;
export function companionFps(petId, fps) {
    return fps === undefined ? undefined
        : ['whale-girl-refined', 'blue-whale-business', 'miku'].includes(petId)
            ? Math.min(MAX_COMPANION_FPS, animationFps(fps)) : fps;
}
export const DEFAULT_TICK_SLOPE = 1 / 6;
export const DEFAULT_TICK_INTERCEPT = 6;
export const MIN_TICK_SLOPE = 0.0001;
export const MAX_TICK_SLOPE = 60;
export const MIN_TICK_INTERCEPT = -60;
export const MAX_TICK_INTERCEPT = 60;
export function tickSlope(value) {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.min(MAX_TICK_SLOPE, Math.max(MIN_TICK_SLOPE, value)) : DEFAULT_TICK_SLOPE;
}
export function tickIntercept(value) {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.min(MAX_TICK_INTERCEPT, Math.max(MIN_TICK_INTERCEPT, value)) : DEFAULT_TICK_INTERCEPT;
}
export function animationMode(value) {
    return value === 'native' || value === 'tick' ? value : 'fixed';
}
export function animationFps(value) {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.min(MAX_ANIMATION_FPS, Math.max(1, value)) : DEFAULT_ANIMATION_FPS;
}
/** Positive linear slope, with saturation at the renderer's 1–60 FPS limits. */
export function tickFps(tokensPerSecond, slope = DEFAULT_TICK_SLOPE, intercept = DEFAULT_TICK_INTERCEPT) {
    const rate = Number.isFinite(tokensPerSecond) ? Math.max(0, tokensPerSecond) : 0;
    return Math.min(MAX_ANIMATION_FPS, Math.max(1, tickSlope(slope) * rate + tickIntercept(intercept)));
}
/** Match the bottom composer StatsPills, including its display rounding. */
export function footerTokensPerSecond(stats) {
    if (typeof stats !== 'object' || stats === null)
        return undefined;
    const { decodeTokens, decodeMs } = stats;
    if (typeof decodeTokens !== 'number' || !Number.isFinite(decodeTokens) || decodeTokens < 0
        || typeof decodeMs !== 'number' || !Number.isFinite(decodeMs) || decodeMs <= 0)
        return undefined;
    const rate = decodeTokens / (decodeMs / 1000);
    if (!Number.isFinite(rate))
        return undefined;
    return rate >= 10 ? Math.round(rate) : Math.round(rate * 10) / 10;
}
export function effectiveFps(display, rate) {
    if (display.animationMode === 'native')
        return undefined;
    if (display.animationMode === 'tick' && rate !== undefined)
        return tickFps(rate, display.animationTickSlope, display.animationTickIntercept);
    return animationFps(display.animationFps);
}
/** Both running directions share the selected FPS policy, including tool execution. */
export function retimeTracks(tracks, fps, runningTrack = 'running-right', density = 1) {
    if (fps === undefined)
        return tracks;
    const ms = 1000 / Math.min(MAX_ANIMATION_FPS, animationFps(fps) * Math.max(1, Math.min(4, density)));
    return Object.fromEntries(Object.entries(tracks).map(([key, track]) => [key, key === runningTrack
            ? { ...track, durations: track.durations.map(() => ms) } : track]));
}
