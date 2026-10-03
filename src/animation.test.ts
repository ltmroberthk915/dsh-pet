import { describe, it, expect } from 'vitest'
import { animationFps, companionFps, effectiveFps, footerTokensPerSecond, retimeTracks, tickFps } from './animation.ts'

describe('playback modes and footer speed', () => {
  it('uses the footer formula and the same rounding, without counting chunks or characters', () => {
    expect(footerTokensPerSecond({ decodeTokens: 2640, decodeMs: 10000 })).toBe(264)
    expect(footerTokensPerSecond({ decodeTokens: 2644, decodeMs: 10000 })).toBe(264)
    expect(footerTokensPerSecond({ decodeTokens: 123, decodeMs: 20000 })).toBe(6.2)
    for (const stats of [undefined, {}, { decodeTokens: NaN, decodeMs: 1 }, { decodeTokens: 2, decodeMs: 0 }, { decodeTokens: -1, decodeMs: 10 }]) expect(footerTokensPerSecond(stats)).toBeUndefined()
  })
  it('maps tok/s monotonically into a bounded animation rate', () => {
    const rates = [0, .1, 1, 10, 30, 60, 120, 264, 500, 1000, 10000]
    const fps = rates.map(rate => tickFps(rate))
    for (let n=1;n<fps.length;n++) expect(fps[n]).toBeGreaterThanOrEqual(fps[n-1]!)
    expect(fps[0]).toBe(6)
    expect(fps.at(-1)).toBe(60)
    expect(tickFps(264)).toBe(50)
  })
  it('uses the configured slope and intercept, including clipping and overflow', () => {
    expect([0, 100, 200].map(rate => tickFps(rate, 0.1, 6))).toEqual([6, 16, 26])
    expect(tickFps(100, 0.2, 10)).toBe(30)
    expect(tickFps(0, 0.1, -10)).toBe(1)
    expect(tickFps(150, 0.1, -10)).toBe(5)
    expect(tickFps(Number.MAX_VALUE, 60, 60)).toBe(60)
    expect(effectiveFps({ animationMode: 'tick', animationTickSlope: 0.1, animationTickIntercept: 4 }, 264)).toBeCloseTo(30.4)
    expect(effectiveFps({ animationMode: 'fixed', animationFps: 24, animationTickSlope: 0.1, animationTickIntercept: 4 }, 264)).toBe(24)
  })
  it('keeps native timing, uses the selected fixed rate, and falls back explicitly when the footer has no data', () => {
    expect(effectiveFps({ animationMode: 'native' }, 264)).toBeUndefined()
    expect(effectiveFps({ animationMode: 'fixed', animationFps: 24 }, 264)).toBe(24)
    expect(effectiveFps({ animationMode: 'tick', animationFps: 12 })).toBe(12)
    expect(effectiveFps({ animationMode: 'tick' }, 264)).toBe(50)
    expect(animationFps(Infinity)).toBe(12)
    expect(animationFps(-2)).toBe(1)
    expect(animationFps(99)).toBe(60)
  })
  it('only changes right-running timing, preserving every other action and the manifest', () => {
    const source = { idle: { frames: [0,1], durations: [500,600], loop: true },
      running: { frames: [0,1], durations: [330,400], loop: true },
      'running-right': { frames: [0,1], durations: [300,400], loop: true } }
    expect(retimeTracks(source)).toBe(source)
    expect(retimeTracks(source, 20)['running-right'].durations).toEqual([50,50])
    expect(retimeTracks(source, 20).idle).toBe(source.idle)
    expect(retimeTracks(source, 20).running).toBe(source.running)
    expect(source.idle.durations).toEqual([500,600])
    expect(source['running-right'].durations).toEqual([300,400])
  })
  it('keeps cycle speed when a pet has twice as many distinct drawings', () => {
    const old = { 'running-right': { durations: Array(8).fill(125) } }
    const dense = { 'running-right': { durations: Array(16).fill(62.5) } }
    for (const fps of [6,12,30]) {
      const cycle = (tracks: Record<string, { durations: number[] }>) => tracks['running-right']!.durations.reduce((a,b)=>a+b,0)
      expect(cycle(retimeTracks(dense,fps,'running-right',2))).toBeCloseTo(cycle(retimeTracks(old,fps)))
    }
    expect(retimeTracks(dense,undefined,'running-right',2)).toBe(dense)
    expect(retimeTracks(dense,60,'running-right',2)['running-right']!.durations.every(ms => ms >= 1000/60)).toBe(true)
  })
  it('caps built-in companion movement at 12 actual FPS at high token rates', () => {
    for (const pet of ['whale-girl-refined','blue-whale-business','miku']) {
      expect(companionFps(pet,effectiveFps({animationMode:'tick'},297))).toBe(12)
      expect(companionFps(pet,6)).toBe(6)
      expect(companionFps(pet,undefined)).toBeUndefined()
    }
    expect(companionFps('custom',50)).toBe(50)
  })
})
