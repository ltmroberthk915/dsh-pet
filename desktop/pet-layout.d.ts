export interface PetRect { x: number; y: number; width: number; height: number }
export interface PetGeometry { artwork: { width: number; height: number }; dimensions: { width: number; height: number } }
export const SECONDARY_SCALE: number
export const PET_GAP: number
export function artworkRect(bounds: Pick<PetRect, 'x' | 'y'>, geometry: PetGeometry): PetRect
export function overlapArea(a: PetRect, b: PetRect, gap?: number): number
export function findOpenPosition(rect: PetRect, occupied: readonly PetRect[], displays: readonly PetRect[], gap?: number): Pick<PetRect, 'x' | 'y'>
