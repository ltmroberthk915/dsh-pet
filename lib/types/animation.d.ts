/** Animation policy shared by the embedded pet and the desktop window. */
export type AnimationMode = 'fixed' | 'native' | 'tick';
export declare const DEFAULT_ANIMATION_FPS = 12;
/** Zero means no running cap, or original timing for other actions. */
export declare function optionalFps(value: unknown): number;
export declare const DEFAULT_TICK_SLOPE: number;
export declare const DEFAULT_TICK_INTERCEPT = 6;
export declare const MIN_TICK_SLOPE = 0.0001;
export declare const MAX_TICK_SLOPE = 60;
export declare const MIN_TICK_INTERCEPT = -60;
export declare const MAX_TICK_INTERCEPT = 60;
export declare function tickSlope(value: unknown): number;
export declare function tickIntercept(value: unknown): number;
export declare function animationMode(value: unknown): AnimationMode;
export declare function animationFps(value: unknown): number;
/** Positive linear slope; no imposed upper FPS limit. */
export declare function tickFps(tokensPerSecond: number, slope?: number, intercept?: number): number;
/** Match the bottom composer StatsPills, including its display rounding. */
export declare function footerTokensPerSecond(stats: unknown): number | undefined;
export declare function effectiveFps(display: {
    animationMode?: AnimationMode;
    animationFps?: number;
    animationTickSlope?: number;
    animationTickIntercept?: number;
    animationRunFpsLimit?: number;
}, rate?: number): number | undefined;
export declare function playbackFrameDuration(track: string, nativeMs: number, runFps?: number, runLimit?: number, actionFps?: number): number;
/** Running and all other actions have independent, user-controlled timing. */
export declare function retimeTracks<T extends {
    durations: number[];
}>(tracks: Record<string, T>, fps?: number, runLimit?: number, actionFps?: number): Record<string, T>;
//# sourceMappingURL=animation.d.ts.map