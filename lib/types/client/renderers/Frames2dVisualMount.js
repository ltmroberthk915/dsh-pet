import { jsx as _jsx } from "react/jsx-runtime";
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { sessionMotionPet } from "../../animation-bindings.js";
import { paletteFrames2d } from "../palette.js";
import { createPhaseStream } from "../phase-stream.js";
import { defaultPetRendererRegistry } from "./registry.js";
/** Mount the frames2d renderer as the sprite's visual (inside the chrome). */
export function Frames2dVisualMount(props) {
    const containerRef = useRef(null);
    const streamRef = useRef(null);
    const handleRef = useRef(null);
    const [invalid, setInvalid] = useState(false);
    const palette = props.snapshot?.color?.palette;
    const frames2d = useMemo(() => props.definition.frames2d === undefined ? undefined
        : { ...paletteFrames2d(props.definition.frames2d, props.definition.id, props.snapshot?.color), frameDensity: props.definition.frameDensity }, [props.definition, palette]);
    const hasSessionMotion = sessionMotionPet(props.definition.id)
        && frames2d?.tracks['running-right'] !== undefined && frames2d.tracks['running-left'] !== undefined;
    // One activation per pet definition: build the contract context and mount.
    useEffect(() => {
        setInvalid(false);
        const container = containerRef.current;
        if (container === null || frames2d === undefined)
            return undefined;
        streamRef.current ??= createPhaseStream(props.phase);
        const cleanups = [];
        const ctx = {
            petId: props.definition.id,
            assetBase: '/pet/' + encodeURIComponent(props.definition.id),
            container,
            phase: streamRef.current,
            interact: props.onPet,
            onCleanup: (fn) => { cleanups.push(fn); },
        };
        let handle;
        try {
            handle = defaultPetRendererRegistry.mount('frames2d', ctx, frames2d);
        }
        catch {
            setInvalid(true);
            return () => { for (const fn of cleanups.splice(0))
                fn(); };
        }
        handleRef.current = handle;
        handle.setPlaybackFps?.(props.fps);
        // The gameplay HUD steers one shared override slot through the bus;
        // mode rules (work blocks drag, sleep wakes on it) keep the two
        // producers from fighting over the slot.
        if (props.bus !== undefined) {
            const gameplayBus = props.bus;
            gameplayBus.setTrack = (track) => {
                // An earlier ambient act or an async wake-up can finish after grab.
                // Its cleanup must not replace the held pose with a fall/standup act.
                if (!props.drag.get())
                    handleRef.current?.setState(track);
            };
            gameplayBus.setIdleTrack = (track) => { handleRef.current?.setIdleTrack(track); };
            // The HUD latches the wanted base idle (skin selection, restored from the
            // host snapshot): apply it on activation, so a late or repeated mount
            // never repaints the pet with the default look.
            if (gameplayBus.idleTrack !== undefined)
                handle.setIdleTrack(gameplayBus.idleTrack);
            cleanups.push(() => {
                gameplayBus.setTrack = undefined;
                gameplayBus.setIdleTrack = undefined;
            });
        }
        // The drag gesture drives the conventional 'drag' track when declared.
        // On release, a declared gameplay.dragEndState (miku: standup) plays
        // once; its fallback auto-releases the override back to the phase map.
        const dragTrack = props.definition.gameplay?.dragState ?? (frames2d.tracks.drag === undefined ? undefined : 'drag');
        const offDrag = props.drag.subscribe((dragging) => {
            if (dragTrack === undefined)
                return;
            if (dragging) {
                handle.setState(dragTrack);
                return;
            }
            handle.setState(props.definition.gameplay?.dragEndState);
        });
        cleanups.push(offDrag);
        if (props.drag.get() && dragTrack !== undefined)
            handle.setState(dragTrack);
        return () => {
            handleRef.current = null;
            for (const fn of cleanups.splice(0))
                fn();
            handle.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one activation per pet identity
    }, [props.definition, frames2d]);
    // Footer statistics change timing in-place; they must never restart a stride
    // or throw away the decoded-frame cache on each host poll.
    useEffect(() => { handleRef.current?.setPlaybackFps?.(props.fps); }, [props.fps, frames2d]);
    useEffect(() => {
        const animation = hasSessionMotion ? props.snapshot?.animation : undefined;
        handleRef.current?.setActivityTrack?.(animation !== undefined && frames2d?.tracks[animation] !== undefined ? animation : undefined);
    }, [props.snapshot?.animation, hasSessionMotion, frames2d]);
    const seenWaves = useRef(new Set());
    const waveKey = props.feedback?.kind === 'pet' ? 'pet:' + props.feedback.at : props.snapshot?.waveKey;
    const waveBlocked = props.snapshot?.generation !== undefined || props.phase === 'done' || props.phase === 'failed'
        || props.snapshot?.gameplay?.mode != null;
    useEffect(() => {
        if (!hasSessionMotion)
            return;
        const handle = handleRef.current;
        if (waveBlocked && handle?.currentTrack() === 'waving')
            handle.setState(undefined);
        if (waveKey === undefined || seenWaves.current.has(waveKey))
            return;
        seenWaves.current.add(waveKey);
        if (seenWaves.current.size > 32)
            seenWaves.current.delete(seenWaves.current.values().next().value);
        if (!waveBlocked && handle !== null && ['idle', 'waiting', 'review', 'running', 'running-right', 'running-left'].includes(handle.currentTrack())) {
            handle.setState('waving');
        }
    }, [waveKey, waveBlocked, hasSessionMotion, frames2d]);
    useEffect(() => {
        if (hasSessionMotion && !props.drag.get() && props.feedback?.kind === 'feed' && props.snapshot?.gameplay?.mode == null) {
            handleRef.current?.setState('eat');
        }
    }, [props.feedback?.at, props.feedback?.kind, hasSessionMotion, frames2d]);
    // Feed the polled phase into the activation's stream (change-only).
    useEffect(() => {
        streamRef.current?.push(props.phase);
    }, [props.phase]);
    return (_jsx("div", { ref: containerRef, "data-dsh-pet-frames2d": props.definition.id, style: { width: '100%', height: '100%', pointerEvents: 'none' }, children: invalid && (_jsx("span", { "data-dsh-pet-frames2d-error": "invalid-config", children: props.t('pet.renderer.unavailable', { renderer: 'frames2d' }) })) }));
}
