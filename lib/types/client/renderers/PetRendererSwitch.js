import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { companionFps, effectiveFps } from "../../animation.js";
/**
 * Renderer switch — the client dispatch seam of the pet center (issue #623,
 * milestone M2 P5 / M3). The pet's manifest picks the renderer: sprite2d
 * hands straight through to the sprite; live2d injects its visual INTO the
 * sprite chrome (the dock, bubbles and panel belong to the pet center, not
 * the renderer); a renderer this build cannot serve renders a clear
 * diagnostic card instead of blanking.
 * @module dsh-pet-copilot/client/renderers/PetRendererSwitch
 */
import { cloneElement, isValidElement, useRef } from 'react';
import { createDragStream } from "../drag-stream.js";
import { defaultPetRendererRegistry } from "./registry.js";
import { Live2dVisualMount } from "./live2d/Live2dVisualMount.js";
import { Frames2dVisualMount } from "./Frames2dVisualMount.js";
/** Dispatch one pet definition to its renderer; unknown kinds get a card. */
export function PetRendererSwitch(props) {
    const renderer = props.definition.renderer ?? 'sprite2d';
    // The frames2d drag stream lives one level up: the chrome (PetSprite)
    // reports the gesture through onDraggingChange, the visual subscribes.
    const dragRef = useRef(null);
    if (dragRef.current === null || dragRef.current.id !== props.definition.id) {
        dragRef.current = { id: props.definition.id, stream: createDragStream() };
    }
    const drag = props.drag ?? dragRef.current.stream;
    if (renderer === 'sprite2d')
        return _jsx(_Fragment, { children: props.children });
    if (renderer === 'frames2d' && defaultPetRendererRegistry.has('frames2d') && isValidElement(props.children)) {
        const visual = (_jsx(Frames2dVisualMount, { definition: props.definition, fps: companionFps(props.definition.id, effectiveFps(props.children.props.display, props.children.props.snapshot?.performance?.tokensPerSecond)), phase: props.phase, snapshot: props.children.props.snapshot, feedback: props.children.props.feedback, onPet: props.onPet, drag: drag, ...(props.bus === undefined ? {} : { bus: props.bus }), t: props.t }));
        return cloneElement(props.children, { visual, onDraggingChange: (dragging) => drag.push(dragging) });
    }
    if (renderer === 'live2d' && defaultPetRendererRegistry.has('live2d') && isValidElement(props.children)) {
        const visual = (_jsx(Live2dVisualMount, { definition: props.definition, phase: props.phase, onPet: props.onPet, t: props.t }));
        return cloneElement(props.children, { visual });
    }
    return (_jsx("span", { "data-dsh-pet-renderer-fallback": renderer, children: props.t('pet.renderer.unavailable', { renderer }) }));
}
