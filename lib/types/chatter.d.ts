/**
 * Pet chatter — the pet's voice while sessions work. Two speakers live here:
 *
 *  1. The status voice (session bubbles): big per-scene copy pools instead of
 *     one fixed line per phase, a fine-grained tool-name → copy-family map,
 *     and a compact real-argument hint ('跑跑 npm test'), in the spirit of
 *     the working-activity plugin's status line. Lines rotate round-robin —
 *     while a phase persists the copy advances every few seconds, so the pet
 *     feels alive without flickering per streamed chunk.
 *  2. The murmur engine (碎碎念): the pet's inner whispers — category
 *     lines woken by the SITUATION (thinking / writing / the running tool
 *     family), plus outcome lines woken only by structured session results
 *     (test green, tool errors, turn completion). The model's own prose is
 *     never read, and no whisper ever quotes real content. Cooldowns keep
 *     whispers occasional.
 *
 * Pure and deterministic: round-robin everywhere (no Math.random), clocks are
 * injected. The first line of each status pool is the legacy fixed copy the
 * plugin has always shown, so existing installs keep their wording until the
 * scene cycles. No emoji anywhere (repository rule); ～ is the whale-girl's
 * signature.
 *
 * Since pet-center M4 (issue #677) every pool is overridable through a
 * {@link VoicePoolsProvider}: the built-in pools are the fallback layer, and
 * voice packs (per-pet voice.json / the global .voice.json) layer their
 * pools on top at draw time.
 * @module dsh-pet-copilot/chatter
 */
/** Status copy scenes — the situations a session bubble can report. */
export type StatusScene = 'prepare' | 'waiting' | 'thinking' | 'review' | 'toolResult' | 'done' | 'failed' | 'toolFailed' | 'maxTokens' | 'interrupted' | 'blocked';
/** While a scene persists, its copy advances on this cadence (ms). */
export declare const STATUS_ROTATE_MS = 4000;
/** Fixed-copy pools per status scene (first line = legacy wording). */
export declare const STATUS_POOLS: Readonly<Record<StatusScene, readonly string[]>>;
/** Tool families for friendlier per-tool status copy. */
export type ToolCategory = 'read' | 'write' | 'edit' | 'shell' | 'grep' | 'find' | 'ls' | 'webSearch' | 'webFetch' | 'mcp' | 'memory' | 'subagent' | 'wait' | 'todo' | 'browser' | 'git' | 'ask' | 'generic';
/** Every status scene key, in declaration order (voice-pack key allow-list). */
export declare const STATUS_SCENES: readonly StatusScene[];
/** Every tool-family key, in declaration order (voice-pack key allow-list). */
export declare const TOOL_CATEGORIES: readonly ToolCategory[];
/** Map a raw tool name onto its copy family (working-activity style regexes). */
export declare function toolCategory(toolName: string): ToolCategory;
/**
 * Per-family tool status pools. '{tool}' interpolates the compact tool name,
 * '{hint}' the compact real-argument hint (both optional per line); the first
 * entry of every pool is the legacy '正在使用 {tool}' wording.
 */
export declare const TOOL_POOLS: Readonly<Record<ToolCategory, readonly string[]>>;
/** Pools for the parallel-tools line; '{n}' interpolates the running count. */
export declare const TOOL_REMAINING_POOL: readonly string[];
/**
 * A compact, human-readable hint of what a tool call actually touches —
 * the command, the path, the pattern, the query. Best-effort parse of the
 * raw arguments JSON; unknown shapes stay hintless. Capped short so the
 * bubble stays compact.
 */
export declare function toolArgHint(toolName: string, argumentsJson: string): string | undefined;
/**
 * Round-robin voice for status copy. Scene-keyed picks stay STABLE while the
 * same scene repeats (streaming chunks re-emit the same phase many times per
 * second, and rotating per chunk would make the bubble flicker), but advance
 * once the scene has persisted past the rotation cadence, so a long thinking
 * stretch keeps changing its wording.
 */
export declare class StatusVoice {
    private readonly pools;
    private readonly rotateMs;
    private readonly counters;
    private lastScene;
    private lastLine;
    private lastLineAt;
    constructor(pools?: VoicePoolsProvider, rotateMs?: number);
    /** Draw the next line of one pool, advancing its round-robin cursor. */
    private draw;
    /** Reuse the stable line or advance when the cadence elapsed. */
    private voice;
    /**
     * A scene's effective pool: the voice-pack override when it carries lines,
     * else the built-in pool. Empty overrides fall back rather than blank the
     * bubble — a scene line always renders.
     */
    private scenePool;
    /** Status line for a phase scene. */
    scene(scene: StatusScene, nowMs: number): string;
    /** Status line for a tool call, with the real-argument hint when known. */
    tool(toolName: string, displayName: string, hint: string | undefined, nowMs: number): string;
    /** Status line while sibling tools still run (always reflects the count). */
    toolRemaining(count: number, nowMs: number): string;
}
/** The pet's outcome moments — woken by structured session results only. */
export type WhisperResult = 'pass' | 'fail' | 'done';
/** The situations a whisper can comment on — the pet's category awareness. */
export type WhisperCategory = 'thinking' | 'writing' | 'reading' | 'editing' | 'running' | 'searching' | 'git' | 'delegating' | 'browsing' | 'generic';
/** Every whisper category key, in declaration order (voice-pack key allow-list). */
export declare const WHISPER_CATEGORIES: readonly WhisperCategory[];
/** Every whisper outcome key, in declaration order (voice-pack key allow-list). */
export declare const WHISPER_RESULTS: readonly WhisperResult[];
/** Murmur pacing: the cooldown between category whispers. */
export declare const WHISPER_COOLDOWN_MS = 9000;
/** Outcome whispers get their own shorter cooldown so a real moment still speaks. */
export declare const WHISPER_RESULT_COOLDOWN_MS = 5000;
/** How long a whisper stays on screen (host-side expiry). */
export declare const WHISPER_TTL_MS = 8000;
/** Map a tool family onto the whisper category it belongs to. */
export declare function whisperCategoryOf(tool: ToolCategory): WhisperCategory;
/**
 * Whether a tool invocation looks like a test run. The whisper engine never
 * reads the model's prose (a discussion that merely mentions a keyword must
 * not wake a mood); a test-outcome mood is wanted only when a test tool
 * actually ran, so the projection marks the call at tool/call time and the
 * pass mood fires from the paired tool/result.
 */
export declare function looksLikeTestTool(name: string, argumentsText: string | undefined): boolean;
/** Category-level inner-whisper pools — the pet knows roughly what is going on. */
export declare const WHISPER_CATEGORY_POOLS: Readonly<Record<WhisperCategory, readonly string[]>>;
/** The pet's outcome reactions — woken by structured session results only. */
export declare const WHISPER_RESULT_POOLS: Readonly<Record<WhisperResult, readonly string[]>>;
/**
 * Voice-pack overrides (pet-center M4, issue #677): the content a voice
 * pack can replace, one pool at a time. Every field is optional — missing
 * keys inherit the built-in pools. Resolution happens at draw time through
 * a provider function, so swapping pets (or editing the global file) re-
 * voices live engines without rebuilding them.
 *
 * Override semantics:
 *  - status/tools/toolRemaining: a non-empty override replaces the built-in
 *    pool for that key; an empty override falls back to the built-in pool
 *    (a scene line always renders, so it can never be blanked).
 *  - whispers.categories / whispers.results: a key replaces that key's
 *    built-in pool; an explicit empty array mutes that channel (a whisper
 *    can always be silenced, unlike a scene line).
 */
export interface VoicePackOverrides {
    /** Status copy pools by scene; each key replaces that scene's pool. */
    status?: Partial<Record<StatusScene, readonly string[]>>;
    /** Tool copy pools by family; each key replaces that family's pool. */
    tools?: Partial<Record<ToolCategory, readonly string[]>>;
    /** The parallel-tools count line pool ({n} interpolates the count). */
    toolRemaining?: readonly string[];
    /** Murmur pools; each key replaces the built-in pool as a whole. */
    whispers?: {
        /** Category pools; a key replaces that category's pool (empty mutes it). */
        categories?: Partial<Record<WhisperCategory, readonly string[]>>;
        /** Outcome pools (test green / error / completion); empty mutes the outcome. */
        results?: Partial<Record<WhisperResult, readonly string[]>>;
    };
}
/** Read the current effective voice-pack overrides (draw-time resolution). */
export type VoicePoolsProvider = () => VoicePackOverrides;
/** The built-in voice pack: the plugin's default copy. */
export declare const BUILTIN_VOICE_PACK: VoicePackOverrides;
/**
 * The murmur engine (碎碎念): the pet's inner voice while sessions work.
 * Category awareness: the projection feeds the current situation (thinking /
 * writing / the running tool family), and the engine answers with a line from
 * that category's pool — so a whisper always roughly knows what is going on
 * without ever quoting real content (no tool names, no paths, no model text).
 * Outcome moments (test green, tool errors, turn completion) fire from the
 * structured result events, never from output text, so a mood cannot mis-
 * fire on a discussion that merely mentions a keyword. A cooldown keeps
 * whispers occasional; all picks are round-robin so tests reproduce exact
 * lines. The voice-pack provider (pet-center M4) swaps the pools at draw
 * time, so a pet switch re-voices live engines in place.
 */
export declare class WhisperEngine {
    private readonly pools;
    private readonly categoryCooldownMs;
    private readonly resultCooldownMs;
    private readonly categoryCursor;
    private readonly resultCursor;
    private lastWhisperAt;
    constructor(pools?: VoicePoolsProvider, categoryCooldownMs?: number, resultCooldownMs?: number);
    /** Effective category pool (an explicit empty override mutes the category). */
    private categoryPool;
    /** Effective outcome pool (an explicit empty override mutes the outcome). */
    private resultPool;
    /**
     * Feed one situation while a session works. Returns the whisper to show,
     * or undefined when the moment stays quiet (cooldown, or the category
     * pool is muted).
     */
    feed(category: WhisperCategory, nowMs: number): string | undefined;
    /**
     * Feed one structured outcome (test green / tool failure / turn
     * completion). Outcomes carry their own shorter cooldown so the emotional
     * moment is heard unless another whisper just spoke.
     */
    result(kind: WhisperResult, nowMs: number): string | undefined;
    private speak;
}
//# sourceMappingURL=chatter.d.ts.map