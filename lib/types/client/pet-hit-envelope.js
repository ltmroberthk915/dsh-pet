import { measuredPetEnvelopes } from "./pet-hit-envelopes.generated.js";
export const petEnvelopes = measuredPetEnvelopes;
/** Custom definitions retain their own full interaction surface. */
export function petHitEnvelope(definition) {
    const envelope = petEnvelopes[definition.id];
    return envelope?.width === definition.cell.width && envelope.height === definition.cell.height
        && envelope.columns === definition.columns && envelope.renderer === (definition.renderer ?? 'sprite2d')
        ? envelope : undefined;
}
/** The DOM and native process use the same stair-step silhouette. */
export function envelopeClipPath(envelope) {
    const point = (x, y) => `${x / envelope.width * 100}% ${y / envelope.height * 100}%`;
    const right = envelope.regions.flatMap(([x, y, w, h]) => [point(x + w, y), point(x + w, y + h)]);
    const left = [...envelope.regions].reverse().flatMap(([x, y, , h]) => [point(x, y + h), point(x, y)]);
    return `polygon(${[...right, ...left].join(',')})`;
}
/** Update only on a pose transition; visuals and input share measured geometry. */
export function applyEnvelopeTrack(element, track) {
    const petId = element.dataset.dshPetHit?.split(':')[0];
    if (!petId)
        return;
    const envelope = petEnvelopes[petId + ':' + track] ?? petEnvelopes[petId];
    if (!envelope || element.dataset.dshPetHit === envelope.id)
        return;
    element.style.clipPath = envelopeClipPath(envelope);
    element.dataset.dshPetHit = envelope.id;
}
export function envelopeRegions(envelope, rect, flipped = false) {
    return envelope.regions.map(([x, y, w, h]) => [
        rect.left + (flipped ? envelope.width - x - w : x) / envelope.width * rect.width,
        rect.top + y / envelope.height * rect.height,
        w / envelope.width * rect.width, h / envelope.height * rect.height,
    ]);
}
