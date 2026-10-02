/**
 * Official session event projection — pure. Maps the durable DSH session
 * vocabulary onto the pet's visual phases and carries an optional completed-
 * turn reward for the ledger. Holds no state of its own; callers keep a
 * {@link ProjectionRuntime} per session and feed events in arrival order.
 *
 * Status copy comes from the chatter voice (big rotating pools, per-tool
 * families, real-argument hints), and the projection feeds the murmur engine
 * (碎碎念) with the SITUATION — thinking/writing during the stream, the
 * running tool family on tool calls, and the STRUCTURED outcome on
 * tool/result and turn/end — so the pet's inner voice always roughly knows
 * what is going on and never mis-fires on output text. The wall clock is
 * injected by the caller, keeping every projection reproducible.
 *
 * Since the 0.1.5-alpha.2 cohort the stream itself is no longer durable
 * vocabulary: per-chunk phase input arrives through the process-local
 * `agent/assistant-stream` publication ({@link projectAssistantStreamFrame}),
 * while the durable log settles one `assistant/message` (or `assistant/attempt`)
 * per attempt.
 * @module @ltmroberthk915/dsh-pet/event-projection
 */
import type { AssistantStreamFrame } from '@deepseek-ai/dsh-agent';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { PetStateInput } from './state.ts';
import { StatusVoice, WhisperEngine, type VoicePoolsProvider } from './chatter.ts';
/** Runtime shape of the optional legacy activity event. */
export interface ActivityStatusEventLike {
    phase?: string;
    line?: string;
    phrase?: string;
}
/** Per-session facts needed to project the official event stream. */
export interface ProjectionRuntime {
    activeTools: Set<string>;
    commandTools: Set<string>;
    toolInputs: Map<string, PetStateInput>;
    fallback?: PetStateInput;
    stream?: {
        attemptId: string;
        revision: number;
        toolNames: Map<string, string>;
        input?: PetStateInput;
    };
    closedAttempts: Set<string>;
    stopped: boolean;
    /** callIds whose tool looked like a test run, marked at tool/call (pet M6). */
    testCalls: Set<string>;
    officialEventsSeen: boolean;
    stepHadFailure: boolean;
    /** Round-robin status copy voice (scene-stable, cadence-rotated). */
    voice: StatusVoice;
    /** Inner-whisper engine fed by the projection's situation and outcomes. */
    whispers: WhisperEngine;
}
/** One official event projection, optionally carrying a completed turn reward. */
export interface PetActivityTransition {
    input: PetStateInput;
    completedTurn?: number;
    /** A fresh inner whisper woken by this event, when any. */
    whisper?: string;
}
/**
 * Fresh projection runtime for a newly seen session. The optional voice-pack
 * provider (pet-center M4, issue #677) hands both chatter engines their
 * pools; engines resolve overrides at draw time, so swapping the provider's
 * pack re-voices live runtimes without rebuilding them.
 */
export declare function emptyProjectionRuntime(pools?: VoicePoolsProvider): ProjectionRuntime;
/** Whether a legacy phase is part of the pet's supported vocabulary. */
export declare function isActivityPhase(phase: string): phase is PetStateInput['phase'];
/**
 * Project the durable DSH session vocabulary into the pet's visual phases.
 * Unknown and log-only events do not disturb the last meaningful activity.
 * @param nowMs - injected wall clock for copy rotation and whisper pacing.
 */
export declare function projectOfficialEvent(event: SessionEvent, runtime: ProjectionRuntime, nowMs?: number): PetActivityTransition | undefined;
/**
 * Project one live `agent/assistant-stream` publication into the pet's visual
 * phases. Chunk frames are the alpha.2 replacement for the retired durable
 * `assistant/chunk` event: a reasoning delta keeps the pet thinking, a text
 * delta moves it to review. Streaming tool arguments retain their tool family;
 * start/end delimit generation so a previous footer rate never speeds up IO.
 */
export declare function projectAssistantStreamFrame(frame: AssistantStreamFrame, runtime: ProjectionRuntime, nowMs?: number): PetActivityTransition | undefined;
//# sourceMappingURL=event-projection.d.ts.map