import type { PetAnimation } from '../state.ts';
export declare function whaleFramePose(animation: PetAnimation, column: number, columns?: number): {
    planted: boolean;
    scale: number;
    pivotY: number;
    offsetX: number;
    offsetY: number;
};
/** Register whole drawings with translation only; never resize the body or graft legs. */
export declare function companionFramePose(petId: string, animation: PetAnimation, column: number): {
    planted: boolean;
    scale: number;
    pivotY: number;
    offsetX: number;
    offsetY: number;
};
//# sourceMappingURL=whale-stability.d.ts.map