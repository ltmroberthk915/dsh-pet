import type { PetAnimation } from '../state.ts'

/** Keep one out of every two closed-eye appearances, without changing timing. */
export function createBlinkFilter(petId: string, columns = 8): (animation: PetAnimation, column: number) => number {
  const smooth = columns === 16
  const openFrames: Partial<Record<PetAnimation, Record<number, number>>> = petId === 'whale-girl-refined'
    ? smooth
      ? { idle: { 6: 5, 7: 5, 8: 10, 9: 10 }, running: { 4: 3, 5: 3, 6: 10, 7: 10, 8: 10, 9: 10 } }
      : { idle: { 1: 0, 3: 2 }, running: { 1: 0, 4: 3 }, review: { 3: 2 } }
    : {}
  let active: string | undefined
  let count = 0
  let keep = true
  return (animation, column) => {
    const open = openFrames[animation]?.[column]
    if (open === undefined) { active = undefined; return column }
    // A generated blink spans several adjacent in-between drawings. Decide
    // once for the entire blink, not independently for each eyelid position.
    const key = animation + ':' + (smooth ? 'blink' : column)
    if (active !== key) { active = key; keep = ++count % 2 === 1 }
    return keep ? column : open
  }
}
