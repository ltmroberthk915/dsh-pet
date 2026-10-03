/** Keep one out of every two closed-eye appearances, without changing timing. */
export function createBlinkFilter(petId, columns = 8) {
    // Dense atlases use explicitly reviewed timelines. The legacy 8-column
    // blink map addresses unrelated drawings in a 32-column atlas.
    if (columns === 32)
        return (_animation, column) => column;
    const smooth = columns === 16;
    const openFrames = petId === 'whale-girl-refined'
        ? smooth
            ? { idle: { 6: 5, 7: 5, 8: 10, 9: 10 }, running: { 4: 3, 5: 3, 6: 10, 7: 10, 8: 10, 9: 10 } }
            : { idle: { 1: 0, 3: 2 }, running: { 1: 0, 4: 3 }, review: { 3: 2 } }
        : {};
    let active;
    let count = 0;
    let keep = true;
    return (animation, column) => {
        const open = openFrames[animation]?.[column];
        if (open === undefined) {
            active = undefined;
            return column;
        }
        // A generated blink spans several adjacent in-between drawings. Decide
        // once for the entire blink, not independently for each eyelid position.
        const key = animation + ':' + (smooth ? 'blink' : column);
        if (active !== key) {
            active = key;
            keep = ++count % 2 === 1;
        }
        return keep ? column : open;
    };
}
