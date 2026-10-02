import type { PetAnimation } from '../state.ts';
/** Keep one out of every two closed-eye appearances, without changing timing. */
export declare function createBlinkFilter(petId: string, columns?: number): (animation: PetAnimation, column: number) => number;
//# sourceMappingURL=blink-frequency.d.ts.map