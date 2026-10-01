import { describe, expect, it } from 'vitest'
import { artworkRect, findOpenPosition, overlapArea, SECONDARY_SCALE, type PetRect } from '../desktop/pet-layout.js'

describe('desktop pet placement', () => {
  const display = { x: 0, y: 0, width: 800, height: 600 }
  it('uses visible sprite bounds and reduces secondary scale by another 15 percent', () => {
    expect(SECONDARY_SCALE).toBeCloseTo(0.527)
    expect(Math.round(163 * SECONDARY_SCALE)).toBe(86)
    expect(artworkRect({ x: 100, y: 100 }, { dimensions: { width: 420, height: 460 }, artwork: { width: 150, height: 163 } }))
      .toEqual({ x: 235, y: 262, width: 150, height: 163 })
  })
  it('keeps freely dragged edge positions when they are clear', () => {
    const rect = { x: -55.25, y: 550, width: 100, height: 100 }
    expect(findOpenPosition(rect, [], [display])).toEqual({ x: rect.x, y: rect.y })
  })
  it('finds the nearest clear gap without moving the existing pet', () => {
    const main = { x: 300, y: 300, width: 150, height: 163 }
    const rect = { x: 335.25, y: 377, width: 80, height: 86 }
    const next = { ...rect, ...findOpenPosition(rect, [main], [display]) }
    expect(overlapArea(next, main)).toBe(0)
    expect(next.x - rect.x).toBe(Math.round(next.x - rect.x))
    expect(next.y).toBe(473)
    expect(main).toEqual({ x: 300, y: 300, width: 150, height: 163 })
  })
  it('separates many new pets at a display corner and works on negative-coordinate monitors', () => {
    const area = { x: -800, y: -600, width: 800, height: 600 }
    const occupied: PetRect[] = [{ x: -154, y: -168, width: 150, height: 163 }]
    for (let i = 0; i < 16; i++) {
      const rect = { x: -84, y: -91, width: 80, height: 86 }
      const next = { ...rect, ...findOpenPosition(rect, occupied, [area]) }
      expect(occupied.every(other => overlapArea(next, other) === 0)).toBe(true)
      expect(next.x).toBeGreaterThanOrEqual(area.x)
      expect(next.y).toBeGreaterThanOrEqual(area.y)
      expect(next.x + next.width).toBeLessThanOrEqual(0)
      expect(next.y + next.height).toBeLessThanOrEqual(0)
      occupied.push(next)
    }
  })
  it('can use an adjacent display and terminates when the entire screen is full', () => {
    const occupied = [{ ...display }]
    const rect = { x: 700, y: 300, width: 80, height: 86 }
    const next = { ...rect, ...findOpenPosition(rect, occupied, [display, { ...display, x: 800 }]) }
    expect(overlapArea(next, occupied[0]!)).toBe(0)
    expect(next.x).toBeGreaterThanOrEqual(810)
    const full = findOpenPosition(rect, occupied, [display])
    expect(Number.isFinite(full.x) && Number.isFinite(full.y)).toBe(true)
  })
})
