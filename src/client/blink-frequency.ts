import type { PetAnimation } from '../state.ts'

/** Keep one out of every two closed-eye appearances, without changing timing. */
export function createBlinkFilter(petId: string): (animation: PetAnimation, column: number) => number {
  const openFrames: Partial<Record<PetAnimation, Record<number, number>>> = petId === 'whale-girl-refined'
    ? { idle: { 1: 0, 3: 2 }, running: { 1: 0, 4: 3 }, review: { 3: 2 } } : {}
  let active: string | undefined
  let count = 0
  let keep = true
  return (animation, column) => {
    const open = openFrames[animation]?.[column]
    if (open === undefined) { active = undefined; return column }
    const key = animation + ':' + column
    if (active !== key) { active = key; keep = ++count % 2 === 1 }
    return keep ? column : open
  }
}
