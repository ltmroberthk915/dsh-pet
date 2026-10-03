import { describe, expect, it } from 'vitest'
import { createBlinkFilter } from './blink-frequency.ts'

describe('refined whale blink frequency', () => {
  it('never substitutes unrelated 8-column drawings in the dense atlas', () => {
    const frame = createBlinkFilter('whale-girl-refined',32)
    for (let cycle=0;cycle<4;cycle++) for (let column=0;column<32;column++) expect(frame('idle',column)).toBe(column)
  })
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
  it.each([['idle', 6, 9], ['running', 4, 9]] as const)('keeps or skips the entire smooth %s blink, including intermediate eyelids', (animation, first, last) => {
    const frame = createBlinkFilter('whale-girl-refined', 16)
    for (let cycle = 0; cycle < 6; cycle++) {
      for (let column = 0; column < 16; column++) {
        const actual = frame(animation, column)
        expect(frame(animation, column)).toBe(actual)
        if (column >= first && column <= last && cycle % 2 === 1) {
          expect(actual).not.toBe(column)
          expect(actual < first || actual > last).toBe(true)
        } else expect(actual).toBe(column)
      }
    }
    for (const track of ['running-right', 'running-left', 'review'] as const) {
      for (let column = 0; column < 16; column++) expect(frame(track, column)).toBe(column)
    }
  })
})
