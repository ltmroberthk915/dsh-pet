import type { ReactNode, ReactPortal } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { type PetDisplayConfig } from '../persist.ts';
import type { PetStateView } from '../service.ts';
import type { PetDefinition } from '../registry.ts';
import type { GameplayBus } from './gameplay-hud.ts';
import type { PetFeedback } from './pet-store.ts';
import { NS } from './locales.ts';
/** Props injected by the plugin apply body (store actions + locale). */
export interface PetSpriteProps {
    /** Latest host snapshot; null while loading. */
    snapshot: PetStateView | null;
    /** The selected pet's registry definition (atlas URL + geometry + tracks). */
    definition: PetDefinition;
    /** Display configuration (persisted by the host). */
    display: PetDisplayConfig;
    /** Active reaction bubble, if any. */
    feedback: PetFeedback | null;
    /** Pet the sprite (click). */
    onPet: () => void;
    /** Feed the sprite (panel button). */
    onFeed: () => void;
    /** Hide the sprite (panel button). */
    onHide: () => void;
    /** Persist a drag position. */
    onDragEnd: (right: number, bottom: number) => void;
    /** Drag gesture notifications for renderers with a drag track (frames2d). */
    onDraggingChange?: (dragging: boolean) => void;
    /** Rename the selected pet (persisted by the host). */
    onRename: (name: string) => void;
    /** Navigate to the session one status bubble reports on. */
    onOpenSession: (sessionId: string) => void;
    /** Clear the reaction bubble (after its CSS animation). */
    onFeedbackDone: () => void;
    /**
     * Custom visual replacing the sprite2d atlas animation (pet-center M3).
     * The chrome (drag, bubbles, panel, tap economy) is untouched: the visual
     * renders inside the sprite box, and the atlas load + frame loop skip.
     */
    visual?: ReactNode;
    /**
     * Gameplay overlay (miku-pet generalization): rendered inside the float
     * container so hover containment and stacking work unchanged. Absent for
     * pets without a gameplay block.
     */
    hud?: ReactNode;
    /**
     * Gameplay tap sink: receives the tap point as sprite-box fractions
     * (0..1). When present the chrome reports the tap IN ADDITION to the
     * affinity pet; the HUD decides zones/no-ops.
     */
    onGameplayTap?: (fractionX: number, fractionY: number) => void;
    /**
     * Gameplay entry (miku-pet generalization): when present the hover panel
     * renders a 玩法 action that opens/closes the gameplay card. The chrome
     * wires it to the HUD through the per-pet bus (openCard), mirroring the
     * onGameplayTap sink. Absent for pets without a gameplay block.
     */
    onGameplayMenu?: () => void;
    /** Disable the drag gesture (gameplay work mode blocks dragging). */
    dragDisabled?: boolean;
    /**
     * Per-pet coordination bus. The chrome registers `walk` here so the gameplay
     * HUD can roam the pet (the same two-way shape the HUD's `tap` uses).
     */
    bus?: GameplayBus;
    /**
     * DOM node the floating chrome portals into. Defaults to document.body
     * (the legacy behavior); the plugin apply passes its owning root (the
     * [data-dsh-plugin="pet"] container) so the root owns the whole surface
     * and a root-keyed suppressor (the portrait mobile layer) hides the pet
     * as one unit instead of missing the portaled sprite.
     */
    portalTarget?: Element;
    /** Locale translate seat (namespace-bound). */
    t: TranslateNS<typeof NS>;
}
/**
 * The floating pet. The spritesheet frame advances on requestAnimationFrame
 * with per-frame durations from the definition's tracks; the atlas image is
 * loaded once and the background position is written straight to the sprite
 * element (no per-frame React state).
 */
export declare function PetSprite(props: PetSpriteProps): ReactPortal;
//# sourceMappingURL=PetSprite.d.ts.map