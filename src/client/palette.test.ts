import { expect, it } from 'vitest'
import { paletteAtlas, paletteFrames2d } from './palette.ts'
import type { PetFrames2dDefinition } from '../registry.ts'

it('selects packaged business palettes and keeps unrelated atlases intact', () => {
  expect(paletteAtlas('/pet/blue-whale-business/spritesheet.webp','blue-whale-business',{ palette:'claude' })).toBe('/pet/blue-whale-business/palettes/claude.png')
  expect(paletteAtlas('/pet/custom/spritesheet.webp','custom',{ palette:'claude' })).toBe('/pet/custom/spritesheet.webp')
})

it('colors every Miku session/interaction frame without mutating the registry or an older Miku pack', () => {
  const track = { frames:['/pet/miku/thumb/idle/1.webp'], durations:[200], loop:true }
  const block: PetFrames2dDefinition = { phases:{idle:'idle'}, tracks:{ idle:track, 'running-right':track, 'running-left':track, eat:track } }
  const colored = paletteFrames2d(block,'miku',{palette:'gpt'})
  expect(colored.tracks.eat!.frames[0]).toBe('/pet/miku/palettes/gpt/thumb/idle/1.webp')
  expect(block.tracks.eat!.frames[0]).toBe('/pet/miku/thumb/idle/1.webp')
  expect(paletteFrames2d(block,'miku',{palette:'ds'})).toBe(block)
  const legacy = { phases:{idle:'idle' as const}, tracks:{idle:track} }
  expect(paletteFrames2d(legacy,'miku',{palette:'gpt'})).toBe(legacy)
})
