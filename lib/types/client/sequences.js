/** Pure timing helpers for manifest-defined scene animation sequences. */
/** Build a {@link SequenceTimeline} over one manifest sequence. */
export function createSequenceTimeline(sequence, tracks) {
    const itemDurations = sequence.map(animation => tracks[animation].durations.reduce((sum, value) => sum + value, 0));
    const sequenceDuration = itemDurations.reduce((sum, value) => sum + value, 0);
    function locate(elapsedMs) {
        let offset = Math.max(0, elapsedMs) % sequenceDuration;
        let itemIndex = 0;
        while (itemIndex < sequence.length - 1 && offset >= itemDurations[itemIndex]) {
            offset -= itemDurations[itemIndex];
            itemIndex += 1;
        }
        const animation = sequence[itemIndex];
        const track = tracks[animation];
        let frameIndex = 0;
        while (frameIndex < track.frames.length - 1 && offset >= track.durations[frameIndex]) {
            offset -= track.durations[frameIndex];
            frameIndex += 1;
        }
        return { animation, frameIndex, remaining: Math.max(1, track.durations[frameIndex] - offset) };
    }
    return {
        frameAt(elapsedMs) { const { animation, frameIndex } = locate(elapsedMs); return { animation, frameIndex }; },
        nextFrameIn(elapsedMs) { return locate(elapsedMs).remaining; },
    };
}
/** Resolve the active track and frame after elapsed milliseconds of a looping sequence. */
export function sequenceFrameAt(sequence, tracks, elapsedMs) {
    return createSequenceTimeline(sequence, tracks).frameAt(elapsedMs);
}
