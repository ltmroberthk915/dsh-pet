import type { PetDefinition } from '../registry.ts';
export type HitRegion = readonly [number, number, number, number];
export interface PetHitEnvelope {
    readonly id: string;
    readonly width: number;
    readonly height: number;
    readonly columns: number;
    readonly renderer: string;
    readonly regions: readonly HitRegion[];
}
export declare const petEnvelopes: Readonly<Record<string, PetHitEnvelope>>;
/** Custom definitions retain their own full interaction surface. */
export declare function petHitEnvelope(definition: PetDefinition): PetHitEnvelope | undefined;
/** The DOM and native process use the same stair-step silhouette. */
export declare function envelopeClipPath(envelope: PetHitEnvelope): string;
/** Update only on a pose transition; visuals and input share measured geometry. */
export declare function applyEnvelopeTrack(element: HTMLElement, track: string): void;
export declare function envelopeRegions(envelope: PetHitEnvelope, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, flipped?: boolean): [number, number, number, number][];
//# sourceMappingURL=pet-hit-envelope.d.ts.map