/** Pure timing helpers for manifest-defined scene animation sequences. */
import type { PetTrackDef } from '../registry.ts';
import type { PetAnimation } from '../state.ts';
export interface SequenceFrame {
    animation: PetAnimation;
    frameIndex: number;
}
/**
 * Precomputed timeline for one looping sequence: the per-item duration table
 * is built once instead of per query. The sprite frame loop asks at
 * animation rate (~60 Hz), where the per-call map/reduce is pure waste.
 */
export interface SequenceTimeline {
    frameAt(elapsedMs: number): SequenceFrame;
    nextFrameIn(elapsedMs: number): number;
}
/** Build a {@link SequenceTimeline} over one manifest sequence. */
export declare function createSequenceTimeline(sequence: readonly PetAnimation[], tracks: Record<PetAnimation, PetTrackDef>): SequenceTimeline;
/** Resolve the active track and frame after elapsed milliseconds of a looping sequence. */
export declare function sequenceFrameAt(sequence: readonly PetAnimation[], tracks: Record<PetAnimation, PetTrackDef>, elapsedMs: number): SequenceFrame;
//# sourceMappingURL=sequences.d.ts.map