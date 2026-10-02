/** Stable session identities; palettes never depend on a later model switch. */
export declare const PET_PALETTES: readonly ["ds", "gpt", "claude", "kimi", "glm"];
export type PetPalette = typeof PET_PALETTES[number];
export interface SessionColor {
    palette: PetPalette;
    hue?: number;
}
export { SECONDARY_SCALE as SECONDARY_PET_SCALE } from '../desktop/pet-layout.js';
/** The model wins over a proxy/provider name, which may serve many families. */
export declare function modelPalette(model: unknown, provider?: unknown): PetPalette | undefined;
/** Keep the preferred family if free; use spare families before extra hues. */
export declare function chooseSessionColor(preferred: PetPalette, occupied: readonly SessionColor[], random?: () => number): SessionColor;
/** Persist only a bounded set of validated palette identifiers and angles. */
export declare function loadSessionColors(value: unknown): Record<string, SessionColor>;
//# sourceMappingURL=session-colors.d.ts.map