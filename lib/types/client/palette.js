import { PET_PALETTES } from "../session-colors.js";
/** Only packaged siblings of the refined atlas can be chosen by state data. */
export function paletteAtlas(atlas, petId, color) {
    if (!['whale-girl-refined', 'blue-whale-business'].includes(petId) || !color || !PET_PALETTES.includes(color.palette))
        return atlas;
    return atlas.slice(0, atlas.lastIndexOf('/') + 1) + 'palettes/' + color.palette + '.png';
}
/** Miku's hair/clothing accents use prebuilt siblings; skin and outlines stay intact. */
export function paletteFrames2d(block, petId, color) {
    if (petId !== 'miku' || block.tracks['running-right'] === undefined || block.tracks['running-left'] === undefined
        || !color || color.palette === 'ds' || !PET_PALETTES.includes(color.palette))
        return block;
    const recolor = (url) => {
        const marker = '/' + encodeURIComponent(petId) + '/';
        const index = url.indexOf(marker);
        if (index < 0)
            return url;
        const split = index + marker.length;
        return url.slice(0, split) + 'palettes/' + color.palette + '/' + url.slice(split);
    };
    return { ...block, tracks: Object.fromEntries(Object.entries(block.tracks).map(([name, track]) => [name, {
                ...track, frames: track.frames.map(recolor),
            }])) };
}
export function paletteFilter(color) {
    return color?.palette === 'ds' && Number.isInteger(color.hue) && color.hue >= 0 && color.hue < 360
        ? `hue-rotate(${color.hue}deg)` : undefined;
}
