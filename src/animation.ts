/** Animation policy shared by the embedded pet and the desktop window. */
export type AnimationMode = 'fixed' | 'native' | 'tick'
export const DEFAULT_ANIMATION_FPS = 12
export const MAX_ANIMATION_FPS = 60
export const DEFAULT_TICK_SLOPE = 1 / 6
export const DEFAULT_TICK_INTERCEPT = 6
export const MIN_TICK_SLOPE = 0.0001
export const MAX_TICK_SLOPE = 60
export const MIN_TICK_INTERCEPT = -60
export const MAX_TICK_INTERCEPT = 60

export function tickSlope(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_TICK_SLOPE, Math.max(MIN_TICK_SLOPE, value)) : DEFAULT_TICK_SLOPE
}

export function tickIntercept(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_TICK_INTERCEPT, Math.max(MIN_TICK_INTERCEPT, value)) : DEFAULT_TICK_INTERCEPT
}

export function animationMode(value: unknown): AnimationMode {
  return value === 'native' || value === 'tick' ? value : 'fixed'
}

export function animationFps(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_ANIMATION_FPS, Math.max(1, value)) : DEFAULT_ANIMATION_FPS
}

/** Positive linear slope, with saturation at the renderer's 1–60 FPS limits. */
export function tickFps(tokensPerSecond: number, slope = DEFAULT_TICK_SLOPE, intercept = DEFAULT_TICK_INTERCEPT): number {
  const rate = Number.isFinite(tokensPerSecond) ? Math.max(0, tokensPerSecond) : 0
  return Math.min(MAX_ANIMATION_FPS, Math.max(1, tickSlope(slope) * rate + tickIntercept(intercept)))
}

/** Match the bottom composer StatsPills, including its display rounding. */
export function footerTokensPerSecond(stats: unknown): number | undefined {
  if (typeof stats !== 'object' || stats === null) return undefined
  const { decodeTokens, decodeMs } = stats as Record<string, unknown>
  if (typeof decodeTokens !== 'number' || !Number.isFinite(decodeTokens) || decodeTokens < 0
    || typeof decodeMs !== 'number' || !Number.isFinite(decodeMs) || decodeMs <= 0) return undefined
  const rate = decodeTokens / (decodeMs / 1000)
  if (!Number.isFinite(rate)) return undefined
  return rate >= 10 ? Math.round(rate) : Math.round(rate * 10) / 10
}

export function effectiveFps(display: { animationMode?: AnimationMode; animationFps?: number; animationTickSlope?: number; animationTickIntercept?: number }, rate?: number): number | undefined {
  if (display.animationMode === 'native') return undefined
  if (display.animationMode === 'tick' && rate !== undefined) return tickFps(rate, display.animationTickSlope, display.animationTickIntercept)
  return animationFps(display.animationFps)
}

/** Both running directions share the selected FPS policy, including tool execution. */
export function retimeTracks<T extends { durations: number[] }>(tracks: Record<string, T>, fps?: number, runningTrack: 'running-right' | 'running-left' = 'running-right'): Record<string, T> {
  if (fps === undefined) return tracks
  const ms = 1000 / animationFps(fps)
  return Object.fromEntries(Object.entries(tracks).map(([key, track]) => [key, key === runningTrack
    ? { ...track, durations: track.durations.map(() => ms) } : track]))
}
