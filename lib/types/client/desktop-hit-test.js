import { petEnvelopes, envelopeRegions } from "./pet-hit-envelope.js";
const TARGETS = '[role="button"],button,input,select,textarea';
/** Native hit testing uses screen coordinates; DOM leave/focus events are only hints. */
export function installDesktopHitTesting(bridge) {
    let last = '', frame, disposed = false;
    let mouseX = -1, mouseY = -1;
    let regions = [], dirty = true, geometryVersion = 0;
    const observed = new Set();
    let floats = [];
    function measure() {
        dirty = false;
        geometryVersion++;
        const currentFloats = [...document.querySelectorAll('[data-dsh-pet-display]')];
        if (floats.length !== currentFloats.length || currentFloats.some((element, i) => element !== floats[i])) {
            layoutMutation.disconnect();
            floats = currentFloats;
            // Position/scale changes live on the float. Observe that style only;
            // sprite background-position changes every animation frame.
            for (const element of floats)
                layoutMutation.observe(element, { attributes: true, attributeFilter: ['style'] });
        }
        const regions = [];
        const current = new Set();
        targets: for (const element of document.querySelectorAll(TARGETS)) {
            current.add(element);
            if (!observed.has(element)) {
                resize?.observe(element);
                observed.add(element);
            }
            const style = getComputedStyle(element);
            if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none')
                continue;
            const rect = element.getBoundingClientRect();
            const envelope = petEnvelopes[element.dataset.dshPetHit ?? ''];
            const measured = envelope ? envelopeRegions(envelope, rect, element.dataset.dshPetHitFlip === 'true')
                : [[rect.left, rect.top, rect.width, rect.height]];
            for (const [x, y, width, height] of measured) {
                const left = Math.max(0, x), top = Math.max(0, y);
                const right = Math.min(window.innerWidth, x + width), bottom = Math.min(window.innerHeight, y + height);
                if (right > left && bottom > top)
                    regions.push([left, top, right - left, bottom - top]);
                if (regions.length >= 256)
                    break targets;
            }
        }
        for (const element of observed)
            if (!current.has(element)) {
                resize?.unobserve(element);
                observed.delete(element);
            }
        return regions;
    }
    function publish(force = false, leave = false) {
        if (disposed)
            return;
        if (dirty)
            regions = measure();
        const hit = !leave && regions.some(([left, top, width, height]) => mouseX >= left && mouseY >= top && mouseX < left + width && mouseY < top + height);
        // The native cursor can disagree with stale DOM coordinates after a
        // resize or synthetic leave. Every changed position must reach native
        // hit testing, even when the DOM's inside/outside answer is unchanged.
        const key = `${mouseX},${mouseY},${hit},${geometryVersion}`;
        if (force || key !== last) {
            last = key;
            bridge.interactive(hit, regions);
        }
    }
    function schedule() {
        dirty = true;
        if (disposed || frame !== undefined)
            return;
        frame = requestAnimationFrame(() => { frame = undefined; publish(true); });
    }
    const move = (event) => { mouseX = event.clientX; mouseY = event.clientY; publish(); };
    // Always report leave, even after a synthetic leave: the native cursor may
    // have remained over the pet for the first event and actually left later.
    const leave = () => publish(true, true);
    const mutation = new MutationObserver(schedule);
    const layoutMutation = new MutationObserver(schedule);
    mutation.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true,
        attributeFilter: ['data-dsh-pet-hit', 'data-dsh-pet-hit-flip', 'class', 'hidden'] });
    // Observe the controls themselves: bubble text/scale and care panels can
    // change size without changing the fixed-size document body.
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined;
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', leave);
    document.addEventListener('animationend', schedule);
    document.addEventListener('transitionend', schedule);
    window.addEventListener('blur', leave);
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
        disposed = true;
        if (frame !== undefined)
            cancelAnimationFrame(frame);
        mutation.disconnect();
        layoutMutation.disconnect();
        resize?.disconnect();
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseleave', leave);
        document.removeEventListener('animationend', schedule);
        document.removeEventListener('transitionend', schedule);
        window.removeEventListener('blur', leave);
        window.removeEventListener('resize', schedule);
    };
}
