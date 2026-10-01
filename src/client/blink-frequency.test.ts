import { describe, expect, it } from 'vitest'
import { createBlinkFilter } from './blink-frequency.ts'

describe('refined whale blink frequency', () => {
  it('halves blink appearances across repeated frames without changing other artwork', () => {
    const frame = createBlinkFilter('whale-girl-refined')
    let blinks = 0
    for (let cycle = 0; cycle < 10; cycle++) {
      for (const column of [0, 1, 2, 3, 4, 5]) {
        const actual = frame('idle', column)
        expect(frame('idle', column)).toBe(actual)
        if ((column === 1 || column === 3) && actual === column) blinks++
      }
    }
    expect(blinks).toBe(10) // The original timeline has 20 blink appearances.
    for (let column = 0; column < 8; column++) expect(frame('running-right', column)).toBe(column)
  })
  it('keeps every other character unchanged', () => {
    const frame = createBlinkFilter('whale-girl')
    for (let cycle=0; cycle<4; cycle++) for (let column=0; column<6; column++) expect(frame('idle',column)).toBe(column)
  })
})
