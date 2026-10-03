import { describe, it, expect } from 'vitest'
import { animationFps, effectiveFps, footerTokensPerSecond, playbackFrameDuration, retimeTracks, tickFps } from './animation.ts'

describe('independent running and other-action timing', () => {
  it('uses the same rounded rate as the footer', () => {
    expect(footerTokensPerSecond({ decodeTokens: 2644, decodeMs: 10000 })).toBe(264)
    expect(footerTokensPerSecond({ decodeTokens: 123, decodeMs: 20000 })).toBe(6.2)
    for (const stats of [undefined, {}, { decodeTokens: NaN, decodeMs: 1 }, { decodeTokens: 2, decodeMs: 0 }, { decodeTokens: -1, decodeMs: 10 }]) expect(footerTokensPerSecond(stats)).toBeUndefined()
  })
  it('does not truncate fast models at 12 or 60 FPS', () => {
    expect(tickFps(293, 1, 1)).toBe(294)
    expect(tickFps(10000)).toBeGreaterThan(1600)
    expect(tickFps(0, 0.1, -10)).toBe(1)
    expect(tickFps(Number.MAX_VALUE, 60, 60)).toBe(Number.MAX_VALUE)
    expect(animationFps(144)).toBe(144)
    expect(animationFps(Infinity)).toBe(12)
    expect(animationFps(-2)).toBe(1)
  })
  it('applies a running cap only when the user sets one', () => {
    const settings = { animationMode: 'tick' as const, animationTickSlope: 1, animationTickIntercept: 1 }
    expect(effectiveFps(settings, 293)).toBe(294)
    expect(effectiveFps({ ...settings, animationRunFpsLimit: 0 }, 293)).toBe(294)
    expect(effectiveFps({ ...settings, animationRunFpsLimit: 120 }, 293)).toBe(120)
    expect(effectiveFps({ animationMode: 'fixed', animationFps: 240 })).toBe(240)
    expect(effectiveFps({ animationMode: 'tick', animationFps: 90 })).toBe(90)
    expect(effectiveFps({ animationMode: 'native' }, 293)).toBeUndefined()
  })
  it('retimes both running directions and preserves other-action holds by default', () => {
    const tracks = { idle: { durations: [5000, 100] }, waving: { durations: [80, 120] },
      'running-right': { durations: [100, 200] }, 'running-left': { durations: [90, 110] } }
    expect(retimeTracks(tracks)).toBe(tracks)
    const timed = retimeTracks(tracks, 294)
    expect(timed['running-right'].durations).toEqual([1000 / 294, 1000 / 294])
    expect(timed['running-left'].durations).toEqual([1000 / 294, 1000 / 294])
    expect(timed.idle).toBe(tracks.idle)
    expect(timed.waving).toBe(tracks.waving)
    expect(tracks['running-right'].durations).toEqual([100, 200])
  })
  it('uses a separate user rate for other actions without inheriting the running cap', () => {
    const tracks = { idle: { durations: [1000] }, waving: { durations: [200] }, 'running-left': { durations: [100] } }
    const timed = retimeTracks(tracks, 294, 30, 144)
    expect(timed['running-left'].durations).toEqual([1000 / 30])
    expect(timed.idle.durations).toEqual([1000 / 144])
    expect(timed.waving.durations).toEqual([1000 / 144])
    expect(retimeTracks(tracks, undefined, 0, 6).idle.durations).toEqual([1000 / 6])
  })
  it('caps material-speed running only when requested', () => {
    expect(playbackFrameDuration('running-right', 5, undefined, 20, 80)).toBe(50)
    expect(playbackFrameDuration('running-left', 200, undefined, 20, 80)).toBe(200)
    expect(playbackFrameDuration('waving', 200, undefined, 20, 80)).toBe(12.5)
  })
})
