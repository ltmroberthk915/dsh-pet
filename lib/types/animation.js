export const DEFAULT_ANIMATION_FPS = 12;
/** Zero means no running cap, or original timing for other actions. */
export function optionalFps(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? value : 0;
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
        ? Math.max(1, value) : DEFAULT_ANIMATION_FPS;
}
/** Positive linear slope; no imposed upper FPS limit. */
export function tickFps(tokensPerSecond, slope = DEFAULT_TICK_SLOPE, intercept = DEFAULT_TICK_INTERCEPT) {
    const rate = Number.isFinite(tokensPerSecond) ? Math.max(0, tokensPerSecond) : 0;
    return Math.min(Number.MAX_VALUE, Math.max(1, tickSlope(slope) * rate + tickIntercept(intercept)));
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
    const fps = display.animationMode === 'tick' && rate !== undefined
        ? tickFps(rate, display.animationTickSlope, display.animationTickIntercept) : animationFps(display.animationFps);
    const limit = optionalFps(display.animationRunFpsLimit);
    return limit > 0 ? Math.min(limit, fps) : fps;
}
export function playbackFrameDuration(track, nativeMs, runFps, runLimit = 0, actionFps = 0) {
    if (track === 'running-right' || track === 'running-left') {
        const duration = runFps === undefined ? nativeMs : 1000 / animationFps(runFps);
        const limit = optionalFps(runLimit);
        return limit > 0 ? Math.max(duration, 1000 / limit) : duration;
    }
    const fps = optionalFps(actionFps);
    return fps > 0 ? 1000 / fps : nativeMs;
}
/** Running and all other actions have independent, user-controlled timing. */
export function retimeTracks(tracks, fps, runLimit = 0, actionFps = 0) {
    let changed = false;
    const result = Object.fromEntries(Object.entries(tracks).map(([key, track]) => {
        const durations = track.durations.map(ms => playbackFrameDuration(key, ms, fps, runLimit, actionFps));
        if (durations.every((ms, i) => ms === track.durations[i]))
            return [key, track];
        changed = true;
        return [key, { ...track, durations }];
    }));
    return changed ? result : tracks;
}
