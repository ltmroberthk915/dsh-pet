import type { PetAnimation, PetStateSnapshot } from './state.ts';
/** The bundled companions share the same session and tool motion vocabulary. */
export declare function sessionMotionPet(petId: string): boolean;
/** Keep other installed characters' phase mappings intact. */
export declare function boundAnimation(petId: string, snapshot: PetStateSnapshot): PetAnimation;
/** Use structured tool names, never assistant prose or the content of scripts. */
export declare function commandTool(name: string): boolean;
//# sourceMappingURL=animation-bindings.d.ts.map