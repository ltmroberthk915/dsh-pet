import { PET_PALETTES, type SessionColor } from '../session-colors.ts'

/** Only packaged siblings of the refined atlas can be chosen by state data. */
export function paletteAtlas(atlas: string, petId: string, color?: SessionColor): string {
  if (petId !== 'whale-girl-refined' || !color || !PET_PALETTES.includes(color.palette)) return atlas
  return atlas.slice(0, atlas.lastIndexOf('/') + 1) + 'palettes/' + color.palette + '.png'
}

export function paletteFilter(color?: SessionColor): string | undefined {
  return color?.palette === 'ds' && Number.isInteger(color.hue) && color.hue! >= 0 && color.hue! < 360
    ? `hue-rotate(${color.hue}deg)` : undefined
}
