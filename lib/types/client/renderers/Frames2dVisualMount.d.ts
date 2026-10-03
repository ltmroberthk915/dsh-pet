/**
 * Frames2d visual mount — the React bridge between the pet center chrome
 * and the imperative frames2d renderer, mirroring the live2d mount. The
 * bridge owns the contract context (asset base, phase stream, interaction
 * write-back, activation cleanups), feeds the polled phase into the stream,
 * forwards the chrome's drag gesture onto the conventional 'drag' track
 * (when the pet declares one), and renders the localized fallback card when
 * the served config is invalid.
 * @module dsh-pet-copilot/client/renderers/Frames2dVisualMount
 */
import { type ReactElement } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { PetDefinition } from '../../registry.ts';
import type { ActivityPhase } from '../../state.ts';
import type { PetStateView } from '../../service.ts';
import type { PetFeedback } from '../pet-store.ts';
import type { DragStream } from '../drag-stream.ts';
import type { GameplayBus } from '../gameplay-hud.tsx';
import type { NS } from '../locales.ts';
/** Mount the frames2d renderer as the sprite's visual (inside the chrome). */
export declare function Frames2dVisualMount(props: {
    definition: PetDefinition;
    fps?: number;
    phase: ActivityPhase;
    snapshot?: PetStateView | null;
    feedback?: PetFeedback | null;
    onPet: () => void;
    /** Chrome drag gesture stream (the renderer switch owns it). */
    drag: DragStream;
    /** Gameplay coordination bus; the mount registers its track override. */
    bus?: GameplayBus;
    t: PropsLocale<typeof NS>['t'];
}): ReactElement;
//# sourceMappingURL=Frames2dVisualMount.d.ts.map