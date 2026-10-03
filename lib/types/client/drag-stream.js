/**
 * Drag stream — bridges the chrome's pointer drag state onto the renderer
 * contract's { get, subscribe } shape, so renderers with a dedicated drag
 * track (frames2d) can follow the chrome-owned drag gesture. Dispatch is
 * change-only, mirroring the phase stream.
 * @module dsh-pet-copilot/client/drag-stream
 */
/** Create the stream (one per pet activation, owned by the renderer switch). */
export function createDragStream() {
    let current = false;
    const listeners = new Set();
    return {
        get: () => current,
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        push(dragging) {
            if (dragging === current)
                return;
            current = dragging;
            for (const listener of [...listeners])
                listener(dragging);
        },
    };
}
