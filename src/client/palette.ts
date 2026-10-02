import { PET_PALETTES, type SessionColor } from '../session-colors.ts'
import type { PetFrames2dDefinition } from '../registry.ts'

/** Only packaged siblings of the refined atlas can be chosen by state data. */
export function paletteAtlas(atlas: string, petId: string, color?: SessionColor): string {
  if (!['whale-girl-refined', 'blue-whale-business'].includes(petId) || !color || !PET_PALETTES.includes(color.palette)) return atlas
  return atlas.slice(0, atlas.lastIndexOf('/') + 1) + 'palettes/' + color.palette + '.png'
}

/** Miku's hair/clothing accents use prebuilt siblings; skin and outlines stay intact. */
export function paletteFrames2d(block: PetFrames2dDefinition, petId: string, color?: SessionColor): PetFrames2dDefinition {
  if (petId !== 'miku' || block.tracks['running-right'] === undefined || block.tracks['running-left'] === undefined
    || !color || color.palette === 'ds' || !PET_PALETTES.includes(color.palette)) return block
  const recolor = (url: string): string => {
    const marker = '/' + encodeURIComponent(petId) + '/'
    const index = url.indexOf(marker)
    if (index < 0) return url
    const split = index + marker.length
    return url.slice(0, split) + 'palettes/' + color.palette + '/' + url.slice(split)
  }
  return { ...block, tracks: Object.fromEntries(Object.entries(block.tracks).map(([name, track]) => [name, {
    ...track, frames: track.frames.map(recolor),
  }])) }
}

export function paletteFilter(color?: SessionColor): string | undefined {
  return color?.palette === 'ds' && Number.isInteger(color.hue) && color.hue! >= 0 && color.hue! < 360
    ? `hue-rotate(${color.hue}deg)` : undefined
}
