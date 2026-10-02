import { type SessionColor } from '../session-colors.ts';
import type { PetFrames2dDefinition } from '../registry.ts';
/** Only packaged siblings of the refined atlas can be chosen by state data. */
export declare function paletteAtlas(atlas: string, petId: string, color?: SessionColor): string;
/** Miku's hair/clothing accents use prebuilt siblings; skin and outlines stay intact. */
export declare function paletteFrames2d(block: PetFrames2dDefinition, petId: string, color?: SessionColor): PetFrames2dDefinition;
export declare function paletteFilter(color?: SessionColor): string | undefined;
//# sourceMappingURL=palette.d.ts.map