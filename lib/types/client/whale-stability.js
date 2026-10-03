import { companionRegistration } from "./companion-registration.js";
// Alpha > 128 bounds measured from the packaged 16-column DS atlas. All five
// palettes share its alpha geometry. CSS registration keeps the original
// drawings intact; no canvas readback, image downloads or per-pixel runtime work.
const tops = {
    idle: [15, 15, 16, 15, 14, 19, 18, 16, 20, 18, 18, 18, 19, 20, 18, 20],
    'running-right': [6, 6, 6, 5, 6, 6, 6, 6],
    'running-left': [6, 6, 6, 5, 6, 6, 6, 6],
    waving: [10, 10, 11, 9, 14, 14, 12, 13, 16, 13, 13, 14, 13, 13],
    jumping: [32, 31, 34, 38, 39, 37, 32, 35, 41, 41, 38, 34, 32, 31, 32, 32],
    failed: [29, 30, 36, 38, 43, 48, 51, 57, 51, 48, 43, 38, 36, 30, 29, 29],
    waiting: [19, 14, 14, 13, 10, 10, 12, 10, 10, 20, 15, 14, 15, 20, 13, 19],
    running: [22, 20, 20, 20, 25, 24, 24, 24, 26, 26, 26, 26, 20, 20, 20, 22],
    review: [12, 10, 9, 11, 20, 18, 15, 18, 20, 11, 9, 10, 12, 10, 9, 10],
};
export function whaleFramePose(animation, column, columns = 16) {
    if (columns === 32)
        return companionFramePose('whale-girl-refined', animation, column);
    const geometry = tops;
    const top = geometry[animation][column] ?? geometry[animation][0];
    const locomotion = animation === 'running-left' || animation === 'running-right';
    const planted = !locomotion && animation !== 'jumping';
    // Keep the shared skirt/leg seam anchored. A bow and crouching hop retain
    // their intentional height change; upright poses have a common crown y=15.
    const pivotY = planted ? 166 : 202;
    const scale = animation === 'failed' || animation === 'jumping' ? 1
        : locomotion ? (202 - 15) / (201 - top) : (pivotY - 15) / (pivotY - top);
    return { planted, scale, pivotY, offsetX: 0, offsetY: locomotion ? scale : 0 };
}
/** Register whole drawings with translation only; never resize the body or graft legs. */
export function companionFramePose(petId, animation, column) {
    const [offsetX = 0, offsetY = 0] = companionRegistration[petId]?.[animation]?.[column] ?? [];
    return { planted: false, scale: 1, pivotY: 0, offsetX, offsetY };
}
