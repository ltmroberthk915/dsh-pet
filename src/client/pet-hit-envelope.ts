import type { PetDefinition } from '../registry.ts'
import { measuredPetEnvelopes } from './pet-hit-envelopes.generated.ts'

export type HitRegion = readonly [number, number, number, number]
export interface PetHitEnvelope {
  readonly id: string
  readonly width: number
  readonly height: number
  readonly columns: number
  readonly renderer: string
  readonly regions: readonly HitRegion[]
}
export const petEnvelopes: Readonly<Record<string, PetHitEnvelope>> = measuredPetEnvelopes

/** Custom definitions retain their own full interaction surface. */
export function petHitEnvelope(definition: PetDefinition): PetHitEnvelope | undefined {
  const envelope = petEnvelopes[definition.id]
  return envelope?.width === definition.cell.width && envelope.height === definition.cell.height
    && envelope.columns === definition.columns && envelope.renderer === (definition.renderer ?? 'sprite2d')
    ? envelope : undefined
}

/** The DOM and native process use the same stair-step silhouette. */
export function envelopeClipPath(envelope: PetHitEnvelope): string {
  const point = (x: number, y: number) => `${x / envelope.width * 100}% ${y / envelope.height * 100}%`
  const right = envelope.regions.flatMap(([x, y, w, h]) => [point(x + w, y), point(x + w, y + h)])
  const left = [...envelope.regions].reverse().flatMap(([x, y, , h]) => [point(x, y + h), point(x, y)])
  return `polygon(${[...right, ...left].join(',')})`
}

/** Update only on a pose transition; visuals and input share measured geometry. */
export function applyEnvelopeTrack(element: HTMLElement, track: string): void {
  const petId = element.dataset.dshPetHit?.split(':')[0]
  if (!petId) return
  const envelope = petEnvelopes[petId + ':' + track] ?? petEnvelopes[petId]
  if (!envelope || element.dataset.dshPetHit === envelope.id) return
  element.style.clipPath = envelopeClipPath(envelope)
  element.dataset.dshPetHit = envelope.id
}

export function envelopeRegions(envelope: PetHitEnvelope, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  flipped = false): [number, number, number, number][] {
  return envelope.regions.map(([x, y, w, h]) => [
    rect.left + (flipped ? envelope.width - x - w : x) / envelope.width * rect.width,
    rect.top + y / envelope.height * rect.height,
    w / envelope.width * rect.width, h / envelope.height * rect.height,
  ])
}
