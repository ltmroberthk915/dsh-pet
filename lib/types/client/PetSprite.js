import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { effectiveFps, playbackFrameDuration, retimeTracks } from "../animation.js";
import { sessionMotionPet } from "../animation-bindings.js";
import { createBlinkFilter } from "./blink-frequency.js";
import { paletteAtlas, paletteFilter } from "./palette.js";
import { companionFramePose, whaleFramePose } from "./whale-stability.js";
/**
 * Pet sprite companion component — the browser half's centerpiece. Renders a
 * fixed-position floating sprite (React portal onto document.body), plays
 * the track matching the host animation snapshot, and exposes the
 * interaction surface: click to pet, hover panel with feed/rename/hide, drag
 * to reposition (persisted via setConfig). Everything visual comes from the
 * pet definition the host serves ('/api/pet/pets' + the state snapshot's
 * pet id), so one component renders every registry entry.
 * @module dsh-pet-copilot/client/PetSprite
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { bubbleScaleFor } from "../persist.js";
import { announcementFresh } from "../announce.js";
import { petRenderSize } from '../../desktop/pet-layout.js';
import { framePosition, rowOfTrack, trimTrack } from "./spritesheet.js";
import { createSequenceTimeline } from "./sequences.js";
import { animationForPhase } from "../state.js";
import styles from './pet.module.css';
/** Clamp a drag offset inside the viewport with a margin. */
function clampOffset(value, max) {
    return Math.max(0, Math.min(max, value));
}
/**
 * The status decoration ornament (pet-center M5, #567). Renders the active
 * phase's frame segment as a CSS-background strip at a compact bubble
 * height; prefers-reduced-motion holds the segment's first frame, and a
 * missing or undecodable asset simply paints nothing (CSS background
 * failure) — the bubble text is never disturbed. The span is aria-hidden;
 * the bubble keeps its own semantics untouched.
 */
function StatusOrnament(props) {
    const { decoration, phase } = props;
    const segment = decoration.phases[phase];
    const shown = segment !== undefined && segment !== 'hide';
    const segmentKey = segment !== undefined && segment !== 'hide' ? segment.from + ':' + segment.to : 'none';
    const spanRef = useRef(null);
    const scale = 18 / decoration.cell.height;
    const frameWidth = Math.round(decoration.cell.width * scale);
    const stripWidth = decoration.columns * frameWidth;
    // Value-stable dependency key: the host serves a fresh DecorationView
    // object on every state poll (2 s), so the effect must not depend on the
    // object identity — otherwise each poll would cancel and restart the
    // frame loop and the animation would jump back to its first frame.
    const durationsKey = decoration.durations.join(',');
    useEffect(() => {
        if (segment === undefined || segment === 'hide')
            return;
        const el = spanRef.current;
        if (el === null)
            return;
        const position = (index) => (-index * frameWidth) + 'px 0px';
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
        el.style.backgroundPosition = position(segment.from);
        // A single-frame segment (from === to) has nothing to animate: with
        // loop=true the wrap branch would reset index to the same frame and the
        // tick would keep rescheduling a no-op rAF forever. Settle on the one
        // frame instead — same as the reduced-motion static hold.
        if (reduceMotion || segment.from === segment.to)
            return;
        let timer = 0;
        let index = segment.from;
        let elapsed = 0;
        let last = performance.now();
        const tick = () => {
            const now = performance.now();
            const delta = now - last;
            last = now;
            elapsed += delta;
            let duration = decoration.durations[index] ?? 120;
            // The segment's frame rate (duration ms, typically 90-160) is far
            // below the rAF cadence, so a 60fps loop would spend ~90% of its
            // ticks doing nothing. Schedule by the remaining time to the next
            // frame instead — the ornament wakes once per frame, not once per
            // screen refresh. A late wake (background tab, jank) carries extra
            // elapsed time, so catch up every due frame like the sprite loop.
            if (elapsed >= duration) {
                do {
                    elapsed -= duration;
                    if (index < segment.to)
                        index += 1;
                    else if (decoration.loop)
                        index = segment.from;
                    // Durations are per frame: a catch-up that crosses frames must
                    // subtract and schedule with the frame it lands on, not the one
                    // the tick started from.
                    duration = decoration.durations[index] ?? 120;
                } while (elapsed >= duration);
                // Only advance the background when the frame actually changes.
                el.style.backgroundPosition = position(index);
            }
            // A non-looping segment settles on its last frame; stop scheduling
            // instead of repainting the same position every frame.
            if (!decoration.loop && index === segment.to)
                return;
            timer = window.setTimeout(tick, Math.max(1, duration - elapsed));
        };
        timer = window.setTimeout(tick, 0);
        return () => window.clearTimeout(timer);
    }, [shown, segmentKey, frameWidth, decoration.loop, durationsKey]);
    if (!shown)
        return null;
    return (_jsx("span", { ref: spanRef, "aria-hidden": "true", "data-dsh-pet-decoration": decoration.id, style: {
            display: 'inline-block',
            width: frameWidth,
            height: 18,
            marginRight: 6,
            verticalAlign: 'middle',
            flexShrink: 0,
            backgroundImage: 'url(' + decoration.entryUrl + ')',
            backgroundSize: stripWidth + 'px 18px',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '0px 0px',
        } }));
}
/**
 * The announcement bubble (dsh-usage linkage): a dedicated, specially
 * designed surface for sibling-plugin facts — a balance or today-spend pill,
 * or a plan-quota card with a tone-tinted accent, a mini meter for percent
 * windows, and the reset instant. It rides the top of the session bubble
 * stack (column-reverse puts the DOM-last child farthest from the sprite)
 * and persists for its TTL instead of the short feedback pop.
 */
function UsageAnnouncementBubble(props) {
    const { announcement } = props;
    const tone = announcement.tone === 'low'
        ? styles.bubbleUsageLow
        : announcement.tone === 'warn'
            ? styles.bubbleUsageWarn
            : styles.bubbleUsageOk;
    return (_jsxs("div", { className: clsx(styles.bubble, styles.bubbleUsage, tone), role: "status", "aria-live": "polite", "data-dsh-pet-announcement": announcement.source, children: [_jsxs("span", { className: styles.bubbleUsageHead, children: [_jsx("span", { className: styles.bubbleUsageTitle, children: announcement.title }), (announcement.kind === 'balance' || announcement.kind === 'cost') && announcement.amount !== undefined && (_jsx("span", { className: styles.bubbleUsageValue, children: announcement.amount })), announcement.kind === 'plan' && announcement.percent !== undefined && (_jsx("span", { className: styles.bubbleUsageValue, children: Math.round(announcement.percent) + '%' }))] }), announcement.kind === 'plan' && announcement.percent !== undefined && (_jsx("span", { className: styles.bubbleUsageMeter, children: _jsx("span", { className: styles.bubbleUsageMeterFill, style: { width: Math.min(100, Math.max(0, announcement.percent)) + '%' } }) })), announcement.note !== undefined && (_jsx("span", { className: styles.bubbleUsageNote, children: announcement.note }))] }));
}
/**
 * The floating pet. The spritesheet frame advances on requestAnimationFrame
 * with per-frame durations from the definition's tracks; the atlas image is
 * loaded once and the background position is written straight to the sprite
 * element (no per-frame React state).
 */
export function PetSprite(props) {
    const { snapshot, definition, display, feedback } = props;
    const spriteRef = useRef(null);
    const whaleUpperRef = useRef(null);
    const whaleFrameRef = useRef(null);
    const whaleLegsRef = useRef(null);
    const floatRef = useRef(null);
    const panelRef = useRef(null);
    // Whichever bubble surface is currently rendered (feedback, the session
    // stack, or the legacy status bubble) — only one exists at a time.
    const bubbleRef = useRef(null);
    const [imageReady, setImageReady] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [manualPanel, setManualPanel] = useState(false);
    const panelOpen = manualPanel || (display.hoverPanelEnabled === true && hovered);
    // Multi-session bubble stack: collapsed by default (only the display
    // session's bubble + a '+N' badge), expanded on stack hover (peek) or by
    // tapping the badge (pinned, for touch). The display session's bubble
    // anchors the bottom of the stack and never moves when extras open above
    // it, so the pointer target cannot flicker.
    const [stackPeek, setStackPeek] = useState(false);
    const [stackPinned, setStackPinned] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [panelAbove, setPanelAbove] = useState(false);
    // Extra margin-bottom for the above-panel so it stacks clear of the
    // bubbles instead of overlapping them (both anchor at the sprite's top).
    const [panelLift, setPanelLift] = useState(0);
    const [nameDraft, setNameDraft] = useState('');
    // Explicit IME composition tracking: some input methods (WeChat IME on
    // Windows) report keydowns with isComposing === false mid-composition, so
    // the native flag alone is not a safe submit/cancel guard (#303).
    const composingRef = useRef(false);
    const [dragPos, setDragPos] = useState(null);
    const dragRef = useRef(null);
    const hideTimerRef = useRef(null);
    useEffect(() => {
        setHovered(false);
        setManualPanel(false);
        setRenaming(false);
    }, [display.hoverPanelEnabled]);
    const frameRef = useRef({
        track: null,
        index: 0,
        elapsed: 0,
    });
    const cell = definition.cell;
    const atlasUrl = paletteAtlas(definition.atlasUrl, definition.id, snapshot?.color);
    const columns = definition.columns;
    const rows = definition.rows;
    const stabilizeWhale = props.visual === undefined && cell.width === 192 && ((definition.id === 'whale-girl-refined' && (columns === 16 || columns === 32) && cell.height === 208)
        || (definition.id === 'blue-whale-business' && columns === 8 && cell.height === 128));
    const phase = snapshot?.phase ?? 'idle';
    const baseAnimation = snapshot?.animation ?? 'idle';
    const waveKey = !sessionMotionPet(definition.id) ? undefined
        : feedback?.kind === 'pet' ? 'pet:' + feedback.at : snapshot?.waveKey;
    const [wave, setWave] = useState();
    const seenWaves = useRef(new Set());
    const waveBlocked = snapshot?.generation !== undefined || phase === 'failed' || phase === 'done';
    useEffect(() => {
        const seen = waveKey !== undefined && seenWaves.current.has(waveKey);
        if (waveKey !== undefined) {
            seenWaves.current.add(waveKey);
            if (seenWaves.current.size > 32)
                seenWaves.current.delete(seenWaves.current.values().next().value);
        }
        if (waveKey === undefined || waveBlocked || seen) {
            setWave(undefined);
            return;
        }
        setWave(waveKey);
        const duration = definition.tracks.waving.durations.reduce((a, b) => a + playbackFrameDuration('waving', b, undefined, 0, display.animationActionFps), 0);
        const timer = window.setTimeout(() => setWave(undefined), duration);
        return () => window.clearTimeout(timer);
    }, [waveKey, waveBlocked, definition.tracks.waving, display.animationActionFps]);
    const animation = wave !== undefined && wave === waveKey && !waveBlocked ? 'waving' : baseAnimation;
    const sequences = definition.sequences;
    const selectedSequence = animation === animationForPhase(phase) ? sequences?.[phase] : undefined;
    const fps = effectiveFps(display, snapshot?.performance?.tokensPerSecond);
    const tracks = useMemo(() => retimeTracks(definition.tracks, fps, display.animationRunFpsLimit, display.animationActionFps), [definition.tracks, fps, display.animationRunFpsLimit, display.animationActionFps]);
    // Hover-panel chrome from the pet's voice pack (pet-center M4, issue
    // #677): every slot falls back to the i18n dictionary when unset. Stat
    // formats carry {rank}/{n}/{points} placeholders the host validated.
    const panel = definition.panel;
    const panelLabel = (slot, i18n) => panel?.labels?.[slot] ?? i18n;
    const panelStat = (slot, i18nKey, values) => {
        const format = panel?.stats?.[slot] ?? props.t(i18nKey, values);
        if (panel?.stats?.[slot] === undefined)
            return format;
        // The host whitelists {rank}/{n}/{points} in every stat slot, so a pack
        // format may reference any of them; substitute all three live values
        // (the slot's own value plus the siblings) instead of only the slot's.
        const all = {
            rank: snapshot?.affinity.rank ?? '?',
            n: snapshot?.treats.stocked ?? 0,
            points: snapshot?.affinity.points ?? 0,
        };
        let text = format;
        for (const [name, value] of Object.entries(all))
            text = text.replaceAll('{' + name + '}', String(value));
        return text;
    };
    const panelShows = (action) => panel?.actions === undefined || panel.actions.includes(action);
    // Load the atlas once; the definition carries the authoritative per-row
    // frame counts and per-track durations, so nothing else is fetched. A
    // custom visual (pet-center M3) replaces the atlas entirely.
    useEffect(() => {
        if (props.visual !== undefined)
            return;
        setImageReady(false);
        let cancelled = false;
        let retryTimer;
        let attempt = 0;
        const maxAttempts = 3;
        let activeImg = null;
        const loadAtlas = () => {
            const img = new Image();
            activeImg = img;
            img.onload = () => {
                if (!cancelled)
                    setImageReady(true);
            };
            img.onerror = () => {
                if (cancelled)
                    return;
                if (attempt < maxAttempts) {
                    attempt += 1;
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
                    retryTimer = setTimeout(loadAtlas, delay);
                }
            };
            img.src = atlasUrl;
        };
        loadAtlas();
        return () => {
            cancelled = true;
            if (retryTimer !== undefined)
                clearTimeout(retryTimer);
            if (activeImg !== null) {
                activeImg.onload = null;
                activeImg.onerror = null;
            }
        };
    }, [atlasUrl, props.visual]);
    // Frame loop: advance the current track and write background-position.
    // Offsets must be in SCALED coordinates (background-position applies to the
    // scaled background image), so the current sprite scale rides a ref that
    // the loop reads every tick. Under prefers-reduced-motion the sprite holds
    // its track's first frame instead of animating (presentation-only; the
    // animation state machine is untouched).
    const spriteScale = petRenderSize(definition.id, display.size) / cell.height;
    const scaleRef = useRef(spriteScale);
    scaleRef.current = spriteScale;
    const blinkFrame = useMemo(() => createBlinkFilter(definition.id, columns), [definition.id, columns]);
    useEffect(() => {
        if (props.visual !== undefined)
            return;
        const reduceMotion = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
        const sequence = animation === animationForPhase(phase) ? sequences?.[phase] : undefined;
        // Sequence state hoisted into the effect scope: the cumulative duration
        // table and each item's trimmed track would otherwise be recomputed every
        // tick (map/reduce plus two slices per frame), the same waste the
        // single-track branch below avoids.
        const timeline = sequence === undefined ? undefined : createSequenceTimeline(sequence, tracks);
        const sequenceItems = sequence === undefined ? undefined : new Map(sequence.map(itemAnimation => {
            const itemRow = rowOfTrack(itemAnimation);
            return [itemAnimation, {
                    row: itemRow,
                    track: trimTrack(tracks[itemAnimation], rows[itemRow] ?? tracks[itemAnimation].frames.length),
                }];
        }));
        const leadAnimation = sequence?.[0] ?? animation;
        const row = rowOfTrack(leadAnimation);
        const track = trimTrack(tracks[leadAnimation], rows[row] ?? tracks[leadAnimation].frames.length);
        // Paint one static sprite frame up front either way, so the pet is never
        // blank while the loop heat-up runs.
        // A footer-rate update changes frame duration, not the current frame index.
        if (frameRef.current.track !== leadAnimation)
            frameRef.current = { track: leadAnimation, index: 0, elapsed: 0 };
        frameRef.current.index = Math.min(frameRef.current.index, track.frames.length - 1);
        const leadCol = blinkFrame(leadAnimation, track.frames[frameRef.current.index]);
        const lead = framePosition(cell, row, leadCol, scaleRef.current);
        let lastPosStr = lead.x + 'px ' + lead.y + 'px';
        const paint = (pos, action, column) => {
            if (spriteRef.current !== null)
                spriteRef.current.style.backgroundPosition = pos;
            const upper = whaleUpperRef.current, frame = whaleFrameRef.current, legs = whaleLegsRef.current;
            if (!stabilizeWhale || !upper || !frame || !legs)
                return;
            const pose = definition.id === 'whale-girl-refined' ? whaleFramePose(action, column, columns)
                : companionFramePose(definition.id, action, column);
            frame.style.backgroundPosition = pos;
            frame.style.transformOrigin = `${84 / 192 * 100}% ${pose.pivotY / 208 * 100}%`;
            frame.style.transform = `translate(${Math.round(pose.offsetX * scaleRef.current)}px, ${Math.round(pose.offsetY * scaleRef.current)}px) scale(${pose.scale})`;
            // Cut out only the legs; the tail keeps moving outside this rectangle.
            upper.style.clipPath = pose.planted
                ? `polygon(0 0,100% 0,100% 100%,${109 / 192 * 100}% 100%,${109 / 192 * 100}% ${170 / 208 * 100}%,${59 / 192 * 100}% ${170 / 208 * 100}%,${59 / 192 * 100}% 100%,0 100%)`
                : 'none';
            legs.style.display = pose.planted ? 'block' : 'none';
            frame.dataset.track = action;
            frame.dataset.column = String(column);
        };
        paint(lastPosStr, leadAnimation, leadCol);
        if (reduceMotion)
            return;
        let raf = 0;
        let frameTimer;
        let last = performance.now();
        let sequenceElapsed = 0;
        // Sleep until the next actual sprite frame. One rAF aligns the paint with
        // the display; idle no longer wakes the renderer on every monitor refresh.
        const schedule = (remaining) => {
            if (frameTimer !== undefined)
                clearTimeout(frameTimer);
            if (remaining <= 32) {
                raf = requestAnimationFrame(tick);
                return;
            }
            frameTimer = setTimeout(() => { raf = requestAnimationFrame(tick); }, remaining);
        };
        const tick = (ts) => {
            const delta = Math.min(10000, Math.max(0, ts - last));
            last = ts;
            if (timeline !== undefined && sequenceItems !== undefined) {
                sequenceElapsed += delta;
                const current = timeline.frameAt(sequenceElapsed);
                const item = sequenceItems.get(current.animation);
                const col = blinkFrame(current.animation, item.track.frames[current.frameIndex]);
                const pos = framePosition(cell, item.row, col, scaleRef.current);
                const posStr = pos.x + 'px ' + pos.y + 'px';
                if (posStr !== lastPosStr) {
                    lastPosStr = posStr;
                    paint(posStr, current.animation, col);
                }
                schedule(timeline.nextFrameIn(sequenceElapsed));
                return;
            }
            // row/track come from the effect scope: they were computed once above
            // and this effect re-runs when animation/tracks/rows change, so the
            // per-frame recompute (trimTrack slices fresh arrays) is pure waste.
            const st = frameRef.current;
            if (st.track !== animation) {
                st.track = animation;
                st.index = 0;
                st.elapsed = 0;
            }
            st.elapsed += delta;
            const maxIndex = track.frames.length - 1;
            // Skip complete cycles in one operation, so an uncapped rate cannot
            // turn a delayed paint into an unbounded per-frame catch-up loop.
            if (track.loop)
                st.elapsed %= track.durations.reduce((sum, ms) => sum + ms, 0);
            while (st.elapsed >= (track.durations[st.index] ?? 100)) {
                st.elapsed -= track.durations[st.index] ?? 100;
                if (st.index < maxIndex)
                    st.index += 1;
                else if (track.loop)
                    st.index = 0;
                else {
                    st.elapsed = 0;
                    break;
                }
            }
            const col = blinkFrame(animation, track.frames[st.index]);
            const pos = framePosition(cell, row, col, scaleRef.current);
            const posStr = pos.x + 'px ' + pos.y + 'px';
            if (posStr !== lastPosStr) {
                lastPosStr = posStr;
                paint(posStr, animation, col);
            }
            if (track.loop || st.index < maxIndex)
                schedule(Math.max(1, track.durations[st.index] - st.elapsed));
        };
        raf = requestAnimationFrame(tick);
        return () => { cancelAnimationFrame(raf); if (frameTimer !== undefined)
            clearTimeout(frameTimer); };
    }, [animation, phase, cell, columns, rows, tracks, sequences, props.visual, blinkFrame, stabilizeWhale, spriteScale, definition.id]);
    // Auto-clear the feedback bubble after its CSS animation. The callback
    // rides a ref so re-renders never reset the timer: the 2s poll rebuilds
    // `props` every tick, and depending on it would starve the timeout.
    const feedbackDoneRef = useRef(props.onFeedbackDone);
    feedbackDoneRef.current = props.onFeedbackDone;
    useEffect(() => {
        if (feedback === null)
            return;
        const timer = window.setTimeout(() => feedbackDoneRef.current(), 2600);
        return () => window.clearTimeout(timer);
    }, [feedback]);
    // Dragging: pointer events on the sprite; position is right/bottom based.
    // `draggedRef` records whether the pointer actually moved, so the browser's
    // trailing click (fired after pointerup) does not pet the sprite.
    const draggedRef = useRef(false);
    const clearHideTimer = () => {
        if (hideTimerRef.current !== null) {
            window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    };
    // Clear any pending auto-hide timer on unmount: a stray callback after
    // teardown reads window through react-dom and failed CI runs with
    // "window is not defined" (slow-runner timing, PetSprite.test.tsx).
    useEffect(() => () => clearHideTimer(), []);
    const onPointerDown = (e) => {
        if (props.dragDisabled === true || e.button !== 0 || dragRef.current !== null)
            return;
        window.dshPetOverlay?.drag('start');
        endWalk(false);
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const current = dragPos ?? { right: display.right, bottom: display.bottom };
        dragRef.current = { pointerId: e.pointerId, startX: window.dshPetOverlay ? e.screenX : e.clientX,
            startY: window.dshPetOverlay ? e.screenY : e.clientY, ...current };
        draggedRef.current = false;
        // A stationary held pointer owns the pet too. Waiting for a movement
        // threshold lets the idle director replace MIKU's held pose while grabbed.
        props.onDraggingChange?.(true);
        setHovered(false);
    };
    const onPointerMove = (e) => {
        const drag = dragRef.current;
        if (drag === null || e.pointerId !== drag.pointerId)
            return;
        const dx = (window.dshPetOverlay ? e.screenX : e.clientX) - drag.startX;
        const dy = (window.dshPetOverlay ? e.screenY : e.clientY) - drag.startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            draggedRef.current = true;
        }
        if (window.dshPetOverlay) {
            window.dshPetOverlay.drag('move');
            return;
        }
        const right = clampOffset(drag.right - dx, window.innerWidth - 40);
        const bottom = clampOffset(drag.bottom - dy, window.innerHeight - 40);
        setDragPos({ right, bottom });
    };
    const onPointerUp = (e) => {
        if (dragRef.current === null)
            return;
        if (e !== undefined && e.pointerId !== dragRef.current.pointerId)
            return;
        dragRef.current = null;
        window.dshPetOverlay?.drag('end');
        props.onDraggingChange?.(false);
        if (draggedRef.current && dragPos !== null)
            props.onDragEnd(dragPos.right, dragPos.bottom);
    };
    const endDragRef = useRef(onPointerUp);
    endDragRef.current = onPointerUp;
    useEffect(() => {
        const cancel = () => endDragRef.current();
        window.addEventListener('blur', cancel);
        return () => { window.removeEventListener('blur', cancel); cancel(); };
    }, []);
    const pos = dragPos ?? { right: display.right, bottom: display.bottom };
    const spriteWidth = Math.round(cell.width * spriteScale);
    const spriteHeight = Math.round(cell.height * spriteScale);
    // --- roaming ---------------------------------------------------------
    // The gameplay HUD rolls when the pet may wander; this side owns the motion
    // (clamped to the viewport), the walk art's facing and the persisted resting
    // spot -- the walk ends on the same write a drag ends with. The walk art
    // faces left, so a rightward walk mirrors the sprite (a vertical walk keeps
    // the side view); every other track stays unmirrored.
    const [facingRight, setFacingRight] = useState(false);
    const walkRafRef = useRef(0);
    const walkTargetRef = useRef(null);
    const dragPosRef = useRef(dragPos);
    dragPosRef.current = dragPos;
    /** Stop an active walk; `persist` lands the pet on the spot it reached. */
    const endWalk = (persist) => {
        if (walkRafRef.current === 0)
            return;
        window.cancelAnimationFrame(walkRafRef.current);
        walkRafRef.current = 0;
        setFacingRight(false);
        const settled = walkTargetRef.current;
        walkTargetRef.current = null;
        if (persist && settled !== null)
            props.onDragEnd(settled.right, settled.bottom);
    };
    useEffect(() => {
        const bus = props.bus;
        if (bus === undefined)
            return undefined;
        bus.walk = (direction, distance, speed) => {
            if (dragRef.current !== null || walkRafRef.current !== 0)
                return 0;
            const current = dragPosRef.current ?? { right: display.right, bottom: display.bottom };
            // Keep the whole sprite on screen with an 8px breathing margin. `right`
            // and `bottom` are CSS offsets: right grows leftwards, bottom upwards.
            const margin = 8;
            const maxRight = Math.max(margin, window.innerWidth - spriteWidth - margin);
            const maxBottom = Math.max(margin, window.innerHeight - spriteHeight - margin);
            const wanted = { ...current };
            if (direction === 'left')
                wanted.right = current.right + distance;
            else if (direction === 'right')
                wanted.right = current.right - distance;
            else if (direction === 'up')
                wanted.bottom = current.bottom + distance;
            else
                wanted.bottom = current.bottom - distance;
            const target = {
                right: Math.max(margin, clampOffset(wanted.right, maxRight)),
                bottom: Math.max(margin, clampOffset(wanted.bottom, maxBottom)),
            };
            const travelled = direction === 'left' ? target.right - current.right
                : direction === 'right' ? current.right - target.right
                    : direction === 'up' ? target.bottom - current.bottom
                        : current.bottom - target.bottom;
            if (travelled < 1)
                return 0;
            const duration = Math.max(150, (travelled / Math.max(1, speed)) * 1000);
            const startedAt = performance.now();
            // The crawl art faces left, so only a rightward walk mirrors it; a
            // vertical walk keeps the side view (there is no front/back art).
            setFacingRight(direction === 'right');
            walkTargetRef.current = current;
            const step = (now) => {
                const t = Math.min(1, (now - startedAt) / duration);
                const next = {
                    right: current.right + (target.right - current.right) * t,
                    bottom: current.bottom + (target.bottom - current.bottom) * t,
                };
                walkTargetRef.current = next;
                setDragPos(next);
                if (t < 1) {
                    walkRafRef.current = window.requestAnimationFrame(step);
                    return;
                }
                walkRafRef.current = 0;
                walkTargetRef.current = null;
                setFacingRight(false);
                props.onDragEnd(next.right, next.bottom);
            };
            walkRafRef.current = window.requestAnimationFrame(step);
            return travelled;
        };
        return () => {
            bus.walk = undefined;
            if (walkRafRef.current !== 0) {
                window.cancelAnimationFrame(walkRafRef.current);
                walkRafRef.current = 0;
            }
            // A cancelled walk must not leave the sprite mirrored.
            setFacingRight(false);
            walkTargetRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one registration per sprite
    }, [props.bus, definition.id, display.right, display.bottom, spriteWidth]);
    // Bubble typography follows the sprite's own scale (#1549), bounded so a
    // shrunk pet never carries unreadably small text.
    const bubbleScale = bubbleScaleFor(display);
    // Concurrent sessions share one bubble slot: only the display session
    // speaks by default, and the rest hide behind a '+N' badge until the stack
    // is hovered/pinned open. The legacy single 'bubble' is the fallback when
    // the host serves no per-session list. The hover panel normally sits below
    // the sprite, so the bubbles stay visible and clickable — no region swap.
    const allowBubbles = snapshot?.primary !== false;
    const sessionBubbles = allowBubbles ? snapshot?.sessions ?? [] : [];
    const stackOpen = stackPeek || stackPinned;
    const collapsed = !stackOpen && sessionBubbles.length > 1;
    const visibleSessions = collapsed ? sessionBubbles.slice(0, 1) : sessionBubbles;
    const statusBubble = allowBubbles && feedback === null && sessionBubbles.length === 0
        ? snapshot?.bubble
        : undefined;
    // The freshest plugin-authored announcement (dsh-usage linkage): a
    // dedicated, specially styled bubble above the session stack. The host
    // already TTL-filters; this client-side check covers the last poll tick.
    const announcement = snapshot?.announcement;
    const usageAnnouncement = allowBubbles && feedback === null && announcement !== undefined && announcementFresh(announcement, Date.now())
        ? announcement
        : undefined;
    // Each session's inner whisper (碎碎念) rides its own bubble — short
    // inner-voice copy woken by that session's activity, never the model's or
    // another session's. Instead of a second bubble of its own, a fresh
    // whisper takes over its session's bubble and re-tints it, so the pet
    // never wears two voices at once. Interaction feedback takes over the
    // whole bubble area while it plays, so whispers yield to it like status
    // copy.
    const bubblePresent = allowBubbles && (feedback !== null || sessionBubbles.length > 0 || statusBubble !== undefined || usageAnnouncement !== undefined);
    const displayName = snapshot?.name ?? definition.displayName;
    // The host-served status decoration (M5, #567); absent = text-only bubbles.
    const decoration = snapshot?.decoration;
    // A settled session list can no longer stay pinned open.
    useEffect(() => {
        if (sessionBubbles.length <= 1)
            setStackPinned(false);
    }, [sessionBubbles.length]);
    useLayoutEffect(() => {
        if (!panelOpen) {
            setPanelAbove(false);
            setPanelLift(0);
            return;
        }
        const updatePanelPlacement = () => {
            const sprite = spriteRef.current;
            const panel = panelRef.current;
            if (sprite === null || panel === null)
                return;
            const availableBelow = window.innerHeight - sprite.getBoundingClientRect().bottom;
            const above = availableBelow < panel.getBoundingClientRect().height + 8;
            setPanelAbove(above);
            // The fallback above-placement shares the sprite's top edge with the
            // bubble(s); lift the panel by the bubble area's height so the two
            // never overlap (8px base gap + 6px clearance above the top bubble).
            const bubbleHeight = above ? bubbleRef.current?.getBoundingClientRect().height ?? 0 : 0;
            setPanelLift(bubbleHeight > 0 ? Math.ceil(bubbleHeight) + 14 : 0);
        };
        updatePanelPlacement();
        window.addEventListener('resize', updatePanelPlacement);
        return () => window.removeEventListener('resize', updatePanelPlacement);
    }, [panelOpen, renaming, pos.right, pos.bottom, display.size, bubblePresent, sessionBubbles.length, stackOpen, feedback]);
    const float = (_jsxs("div", { ref: floatRef, className: styles.float, style: {
            right: pos.right,
            bottom: pos.bottom,
            zIndex: 2147483000,
            // Read by .bubble / .bubbleStatus in pet.module.css.
            ...{ '--pet-bubble-scale': String(bubbleScale) },
        }, onPointerEnter: () => {
            clearHideTimer();
            if (display.hoverPanelEnabled === true)
                setHovered(true);
        }, onPointerLeave: (e) => {
            // The panel renders OUTSIDE the container's box (absolute, below
            // the sprite), so moving onto it fires pointerleave on the container.
            // Treat a target still inside the container's DOM (the overflowed
            // panel) as "still hovering"; otherwise give the pointer a short
            // grace period to reach the panel across the gap below the sprite.
            // The bridge ('.panel::after') keeps the pointer inside the hit
            // area, and the grace period covers a slow mouse crossing the
            // remaining sliver.
            const next = e.relatedTarget;
            if (next instanceof Node && floatRef.current?.contains(next))
                return;
            // Never auto-hide while the rename box is open: moving the pointer
            // onto an IME candidate window (an OS-level window outside the
            // webview) fires pointerleave, and unmounting the input mid-IME-
            // composition crashes some input methods / the renderer (#303).
            if (renaming)
                return;
            clearHideTimer();
            hideTimerRef.current = window.setTimeout(() => { setHovered(false); setManualPanel(false); }, 300);
        }, children: [_jsx("div", { className: styles.spriteWrap, style: { width: spriteWidth, height: spriteHeight }, children: _jsxs("div", { ref: spriteRef, className: styles.sprite, "data-dsh-pet-animation": animation, style: {
                        width: spriteWidth,
                        height: spriteHeight,
                        position: 'relative',
                        ...(props.visual === undefined
                            ? {
                                backgroundImage: imageReady && !stabilizeWhale ? 'url(' + atlasUrl + ')' : undefined,
                                backgroundSize: (cell.width * columns * spriteScale) + 'px ' + (cell.height * (definition.atlasRows ?? rows.length) * spriteScale) + 'px',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: '0 0',
                            }
                            : {}),
                        cursor: dragRef.current === null ? 'grab' : 'grabbing',
                        filter: paletteFilter(snapshot?.color),
                        ...(facingRight ? { transform: 'scaleX(-1)' } : {}),
                    }, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp, onLostPointerCapture: onPointerUp, onContextMenu: e => {
                        e.preventDefault();
                        clearHideTimer();
                        setManualPanel(open => !open);
                    }, onKeyDown: e => {
                        if (e.key === 'Escape') {
                            setHovered(false);
                            setManualPanel(false);
                        }
                    }, onDoubleClick: () => { if (snapshot?.primary === false && snapshot.sessionId)
                        props.onOpenSession(snapshot.sessionId); }, onClick: (e) => {
                        // A pointer sequence that moved (dragged) still fires a trailing
                        // click; skip the pet when that happened.
                        if (draggedRef.current)
                            return;
                        if (props.onGameplayTap !== undefined && spriteRef.current !== null) {
                            const rect = spriteRef.current.getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0) {
                                props.onGameplayTap((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
                            }
                        }
                        props.onPet();
                    }, role: "button", tabIndex: 0, "aria-label": definition.displayName, children: [stabilizeWhale && _jsxs(_Fragment, { children: [_jsx("div", { ref: whaleUpperRef, "aria-hidden": "true", style: { position: 'absolute', inset: 0, pointerEvents: 'none' }, children: _jsx("div", { ref: whaleFrameRef, "data-dsh-pet-registered-frame": "true", style: {
                                            position: 'absolute', inset: 0,
                                            backgroundImage: imageReady ? 'url(' + atlasUrl + ')' : undefined,
                                            backgroundSize: `${cell.width * columns * spriteScale}px ${cell.height * (definition.atlasRows ?? rows.length) * spriteScale}px`,
                                            backgroundRepeat: 'no-repeat',
                                        } }) }), _jsx("div", { ref: whaleLegsRef, "data-dsh-pet-planted": "true", "aria-hidden": "true", style: {
                                        position: 'absolute', inset: 0, pointerEvents: 'none',
                                        clipPath: `inset(${170 / 208 * 100}% ${83 / 192 * 100}% 0 ${59 / 192 * 100}%)`,
                                        backgroundImage: imageReady ? 'url(' + atlasUrl + ')' : undefined,
                                        backgroundSize: `${cell.width * columns * spriteScale}px ${cell.height * (definition.atlasRows ?? rows.length) * spriteScale}px`,
                                        backgroundRepeat: 'no-repeat', backgroundPosition: '0 0',
                                    } })] }), props.visual] }) }), props.hud, allowBubbles && feedback !== null && (_jsx("div", { ref: bubbleRef, className: clsx(styles.bubble, feedback.kind === 'feed' ? styles.bubbleFeed : styles.bubblePet), children: feedback.text }, feedback.at)), feedback === null && (sessionBubbles.length > 0 || statusBubble !== undefined || usageAnnouncement !== undefined) && (_jsxs("div", { ref: bubbleRef, className: styles.bubbleStack, onPointerEnter: () => setStackPeek(true), onPointerLeave: () => setStackPeek(false), children: [visibleSessions.map((session, index) => {
                        // A session's whisper rides ITS OWN bubble (the stack lead when
                        // the current session has one, any bubble when the stack is
                        // expanded). The key swap restarts the entrance animation so the
                        // mood change reads as the bubble re-speaking.
                        const speaksWhisper = session.whisper !== undefined;
                        const bubble = (_jsxs("button", { type: "button", className: clsx(styles.bubble, styles.bubbleStatus, styles.bubbleClickable, speaksWhisper && styles.bubbleWhisper), title: props.t('pet.openSessionHint'), onClick: () => { props.onOpenSession(session.sessionId); }, children: [index === 0 && !speaksWhisper && decoration !== undefined && (_jsx(StatusOrnament, { decoration: decoration, phase: phase })), session.whisper ?? session.bubble] }, speaksWhisper ? 'whisper:' + session.whisper : session.sessionId));
                        // The primary bubble carries the '+N' badge while other sessions
                        // hide behind it; the badge toggles the pinned (touch) expansion.
                        if (index !== 0 || sessionBubbles.length <= 1)
                            return bubble;
                        return (_jsxs("span", { className: styles.bubbleAnchor, children: [bubble, _jsx("button", { type: "button", className: styles.bubbleMore, title: stackOpen
                                        ? props.t('pet.collapseSessions')
                                        : props.t('pet.moreSessions', { n: sessionBubbles.length - 1 }), "aria-label": stackOpen
                                        ? props.t('pet.collapseSessions')
                                        : props.t('pet.moreSessions', { n: sessionBubbles.length - 1 }), "aria-expanded": stackOpen, onClick: (e) => {
                                        e.stopPropagation();
                                        setStackPinned(open => !open);
                                    }, children: stackOpen ? '×' : '+' + String(sessionBubbles.length - 1) })] }, "primary"));
                    }), sessionBubbles.length === 0 && statusBubble !== undefined && (_jsxs("div", { className: clsx(styles.bubble, styles.bubbleStatus), role: "status", "aria-live": "polite", children: [decoration !== undefined && (_jsx(StatusOrnament, { decoration: decoration, phase: phase })), statusBubble] }, "status")), usageAnnouncement !== undefined && _jsx(UsageAnnouncementBubble, { announcement: usageAnnouncement })] })), panelOpen && dragRef.current === null && (_jsx("div", { ref: panelRef, "data-pet-care-panel": "true", className: clsx(styles.panel, panelAbove && styles.panelAbove), "data-placement": panelAbove ? 'above' : 'below', style: panelAbove && panelLift > 0
                    ? { marginBottom: panelLift }
                    : undefined, onPointerEnter: () => {
                    // Reaching the panel (or its bridge) must cancel any hide timer
                    // the container's pointerleave may have armed while the pointer
                    // crossed the sliver between the sprite and the panel.
                    clearHideTimer();
                }, children: renaming ? (_jsxs("div", { className: styles.renameRow, children: [_jsx("input", { className: styles.nameInput, value: nameDraft, maxLength: 20, placeholder: props.t('pet.namePlaceholder'), autoFocus: true, onChange: (e) => setNameDraft(e.target.value), onCompositionStart: () => { composingRef.current = true; }, onCompositionEnd: () => { composingRef.current = false; }, onKeyDown: (e) => {
                                // While an IME composition is active (e.g. selecting a
                                // Chinese candidate), Enter/Escape keydowns belong to the
                                // input method: ignore them so candidate selection can
                                // neither submit the draft nor close the rename box. The
                                // explicit ref and the 'Process' key cover IMEs that mark
                                // composition keydowns with isComposing === false (#303).
                                if (composingRef.current || e.nativeEvent.isComposing || e.key === 'Process')
                                    return;
                                if (e.key === 'Enter') {
                                    const trimmed = nameDraft.trim();
                                    if (trimmed !== '') {
                                        props.onRename(trimmed);
                                        setRenaming(false);
                                    }
                                }
                                else if (e.key === 'Escape') {
                                    setRenaming(false);
                                }
                            } }), _jsx("button", { type: "button", className: styles.action, onClick: () => {
                                const trimmed = nameDraft.trim();
                                if (trimmed !== '') {
                                    props.onRename(trimmed);
                                    setRenaming(false);
                                }
                            }, children: panelLabel('confirm', props.t('pet.confirm')) })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: styles.rankRow, children: [_jsx("span", { className: styles.nameCell, children: displayName }), _jsx("span", { className: styles.statRank, children: (() => {
                                        const rawRank = snapshot?.affinity.rank ?? '?';
                                        const rankKey = `pet.rank.name.${rawRank}`;
                                        const localized = props.t(rankKey);
                                        const rankName = localized !== rankKey ? localized : rawRank;
                                        return panelStat('rank', 'pet.rank', { rank: rankName });
                                    })() })] }), _jsxs("div", { className: styles.rankRow, children: [_jsx("span", { className: styles.statTreats, children: panelStat('treats', 'pet.treats', { n: snapshot?.treats.stocked ?? 0 }) }), _jsx("span", { className: styles.statPoints, children: panelStat('points', 'pet.points', { points: snapshot?.affinity.points ?? 0 }) })] }), _jsxs("div", { className: styles.actions, children: [panelShows('feed') && (_jsx("button", { type: "button", className: styles.action, onClick: props.onFeed, children: panelLabel('feed', props.t('pet.feed')) })), panelShows('rename') && (_jsx("button", { type: "button", className: styles.action, onClick: () => {
                                        // Cancel any pending hide so the rename box cannot
                                        // unmount right as the user starts typing (#303).
                                        clearHideTimer();
                                        setNameDraft(displayName);
                                        setRenaming(true);
                                    }, children: panelLabel('rename', props.t('pet.rename')) })), panelShows('hide') && (_jsx("button", { type: "button", className: styles.action, onClick: props.onHide, children: panelLabel('hide', props.t('pet.hide')) })), props.onGameplayMenu !== undefined && (_jsx("button", { type: "button", className: styles.action, onClick: props.onGameplayMenu, children: props.t('pet.gameplay.menu') }))] })] })) }))] }));
    return createPortal(float, props.portalTarget ?? document.body);
}
