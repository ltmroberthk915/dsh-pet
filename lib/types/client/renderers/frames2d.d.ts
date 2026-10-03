/**
 * frames2d renderer — plays the free-form named frame-sequence tracks of a
 * frames2d pet (manifest v2 'frames2d' block). The pet center picks the
 * track from the ActivityPhase stream (phase -> track map, idle fallback);
 * the gameplay driver may force a track through the handle's setState
 * override (drag/work/sleep/shop...), and a finished non-loop track settles
 * into its fallback, releasing the override when the fallback matches the
 * phase-mapped track. Rendering never throws: a broken track list degrades
 * to the first decodable frame, and the 1.2 s stall watchdog re-kicks the
 * playback chain after timer throttling.
 *
 * Frame presentation has two modes picked once at mount by capability
 * probing:
 * - Canvas bitmap buffer (default where createImageBitmap/fetch/2D context
 *   exist): frames are decoded once into an ImageBitmap on demand, with a
 *   bounded look-ahead window over the playing track, and drawn onto one
 *   <canvas> - steady-state playback issues zero DOM mutations and zero
 *   re-decodes (measured hotspot: swapping <img>.src per frame drove image
 *   decode + invalidation every tick).
 * - Classic <img> fallback (jsdom/tests or missing APIs): identical to the
 *   historical behavior - cache-warm Image elements plus guarded src swaps,
 *   so environments without modern decoding keep working unchanged.
 *
 * @module dsh-pet-copilot/client/renderers/frames2d
 */
import { type PetRenderer, type PetRendererHandle } from '../../contracts/renderer.ts';
import type { ActivityPhase } from '../../state.ts';
/** One track as served inside the pet definition (browser URLs). */
export interface Frames2dTrackConfig {
    frames: string[];
    durations: number[];
    loop: boolean;
    fallback?: string;
}
/** The frames2d block as served inside the pet definition. */
export interface PetFrames2dConfig {
    frameDensity?: number;
    tracks: Record<string, Frames2dTrackConfig>;
    phases: Partial<Record<ActivityPhase, string>> & {
        idle: string;
    };
    /** Selectable skins; each swaps the base idle target while selected. */
    skins?: Frames2dSkinConfig[];
}
/** One selectable skins entry as served inside the pet definition. */
export interface Frames2dSkinConfig {
    id: string;
    label: string;
    /** A declared looping track that becomes the base idle while selected. */
    idleTrack: string;
    /** Click actions exclusive to this skin (roll by probability; miss → touch zones). */
    clickActions?: Frames2dSkinClickActionConfig[];
    /** Gameplay-state overrides (state -> track) swapped in while selected. */
    gameplayTracks?: Record<string, string>;
}
/** One probability-rolled tap action a skin may declare. */
export interface Frames2dSkinClickActionConfig {
    track: string;
    probability: number;
    phrases?: string[];
}
export interface Frames2dRendererHandle extends PetRendererHandle {
    /** Force a track id (gameplay override); undefined returns to phase mapping. */
    setState(track: string | undefined): void;
    /**
     * Swap the base idle target (idle phase, unmapped phases and every
     * fallback back to idle) to a declared looping track — a skin. undefined
     * restores the manifest idle track.
     */
    setIdleTrack(track: string | undefined): void;
    /** Session motion is the base track; explicit gameplay overrides keep priority. */
    setActivityTrack(track: string | undefined): void;
    /** Retime both run directions without remounting, redecoding, or resetting the stride. */
    setPlaybackFps(fps: number | undefined): void;
    /** The track currently playing (diagnostics and tests). */
    currentTrack(): string;
}
export declare const frames2dRenderer: PetRenderer<PetFrames2dConfig>;
//# sourceMappingURL=frames2d.d.ts.map