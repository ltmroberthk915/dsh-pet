/** Animation policy shared by the embedded pet and the desktop window. */
export type AnimationMode = 'fixed' | 'native' | 'tick';
export declare const DEFAULT_ANIMATION_FPS = 12;
export declare const MAX_ANIMATION_FPS = 60;
/** Hand-drawn companions need a readable gait, even with very fast models. */
export declare const MAX_COMPANION_FPS = 12;
export declare function companionFps(petId: string, fps?: number): number | undefined;
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
/** Positive linear slope, with saturation at the renderer's 1–60 FPS limits. */
export declare function tickFps(tokensPerSecond: number, slope?: number, intercept?: number): number;
/** Match the bottom composer StatsPills, including its display rounding. */
export declare function footerTokensPerSecond(stats: unknown): number | undefined;
export declare function effectiveFps(display: {
    animationMode?: AnimationMode;
    animationFps?: number;
    animationTickSlope?: number;
    animationTickIntercept?: number;
}, rate?: number): number | undefined;
/** Both running directions share the selected FPS policy, including tool execution. */
export declare function retimeTracks<T extends {
    durations: number[];
}>(tracks: Record<string, T>, fps?: number, runningTrack?: 'running-right' | 'running-left', density?: number): Record<string, T>;
//# sourceMappingURL=animation.d.ts.map