const TARGETS = '[role="button"],button,input,select,textarea';
/** Native hit testing uses screen coordinates; DOM leave/focus events are only hints. */
export function installDesktopHitTesting(bridge) {
    let last = '', frame, disposed = false;
    let mouseX = -1, mouseY = -1;
    function publish(force = false, leave = false) {
        if (disposed)
            return;
        const regions = [];
        for (const element of document.querySelectorAll(TARGETS)) {
            const style = getComputedStyle(element);
            if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none')
                continue;
            const rect = element.getBoundingClientRect();
            const left = Math.max(0, rect.left), top = Math.max(0, rect.top);
            const right = Math.min(window.innerWidth, rect.right), bottom = Math.min(window.innerHeight, rect.bottom);
            if (right > left && bottom > top)
                regions.push([left, top, right - left, bottom - top]);
            if (regions.length === 64)
                break;
        }
        const hit = !leave && regions.some(([left, top, width, height]) => mouseX >= left && mouseY >= top && mouseX < left + width && mouseY < top + height);
        const key = JSON.stringify([hit, regions]);
        if (force || key !== last) {
            last = key;
            bridge.interactive(hit, regions);
        }
    }
    function schedule() {
        if (disposed || frame !== undefined)
            return;
        frame = requestAnimationFrame(() => { frame = undefined; publish(true); });
    }
    const move = (event) => { mouseX = event.clientX; mouseY = event.clientY; publish(); };
    // Always report leave, even after a synthetic leave: the native cursor may
    // have remained over the pet for the first event and actually left later.
    const leave = () => publish(true, true);
    const mutation = new MutationObserver(schedule);
    mutation.observe(document.body, { childList: true, subtree: true });
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined;
    resize?.observe(document.body);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', leave);
    window.addEventListener('blur', leave);
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
        disposed = true;
        if (frame !== undefined)
            cancelAnimationFrame(frame);
        mutation.disconnect();
        resize?.disconnect();
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseleave', leave);
        window.removeEventListener('blur', leave);
        window.removeEventListener('resize', schedule);
    };
}
