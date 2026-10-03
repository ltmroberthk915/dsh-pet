/** Stable session identities; palettes never depend on a later model switch. */
export const PET_PALETTES = ['ds', 'gpt', 'claude', 'kimi', 'glm'];
export { SECONDARY_SCALE as SECONDARY_PET_SCALE } from '../desktop/pet-layout.js';
/** The model wins over a proxy/provider name, which may serve many families. */
export function modelPalette(model, provider) {
    const match = (value) => {
        if (typeof value !== 'string')
            return undefined;
        const name = value.toLowerCase();
        if (/claude|anthropic/.test(name))
            return 'claude';
        if (/kimi|moonshot/.test(name))
            return 'kimi';
        if (/glm|zhipu|z\.ai/.test(name))
            return 'glm';
        if (/deepseek|(^|[\s/_-])ds([\s/_-]|$)/.test(name))
            return 'ds';
        if (/gpt|openai|codex|^o[134]([-.]|$)/.test(name))
            return 'gpt';
        return undefined;
    };
    return match(model) ?? match(provider);
}
/** Keep the preferred family if free; use spare families before extra hues. */
export function chooseSessionColor(preferred, occupied, random = Math.random) {
    const used = new Set(occupied.filter(c => c.hue === undefined).map(c => c.palette));
    if (occupied.length < 5) {
        if (!used.has(preferred))
            return { palette: preferred };
        const spare = PET_PALETTES.filter(p => !used.has(p));
        if (spare.length)
            return { palette: spare[Math.min(spare.length - 1, Math.floor(random() * spare.length))] };
    }
    // Farthest-point sampling of candidate hues prevents adjacent random draws
    // from producing several visually identical extras. Zero is original DS.
    const hues = occupied.map(c => c.hue ?? ({ ds: 0, gpt: 270, claude: 185, kimi: 0, glm: 65 })[c.palette]);
    let best = 0, distance = -1;
    const offset = Math.floor(random() * 360);
    for (let n = 0; n < 72; n++) {
        const hue = (offset + n * 5) % 360;
        const nearest = Math.min(...hues.map(h => Math.min(Math.abs(h - hue), 360 - Math.abs(h - hue))));
        if (nearest > distance) {
            best = hue;
            distance = nearest;
        }
    }
    return { palette: 'ds', hue: best };
}
/** Persist only a bounded set of validated palette identifiers and angles. */
export function loadSessionColors(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return Object.fromEntries(Object.entries(value).slice(-512).flatMap(([id, raw]) => {
        if (!id || id.length > 200 || !raw || typeof raw !== 'object')
            return [];
        const c = raw;
        if (!PET_PALETTES.includes(c.palette))
            return [];
        if (c.hue !== undefined && (!Number.isInteger(c.hue) || c.hue < 0 || c.hue >= 360))
            return [];
        return [[id, { palette: c.palette, ...(c.hue === undefined ? {} : { hue: c.hue }) }]];
    }));
}
