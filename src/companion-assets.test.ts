import { expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadPetRegistry, PET_ROW_ORDER, petPackageRoot } from './registry.ts'
import { imageDimensions } from './image-dimensions.ts'
import { companionFramePose, whaleFramePose } from './client/whale-stability.ts'

it('ships all three companions with a stable whale default and every declared frame/palette', () => {
  const root = petPackageRoot(import.meta.url)
  const registry = loadPetRegistry({ packageRoot:root, singlePet:true, petsDir:'', dshPetsDir:'' })
  expect(registry.warnings).toEqual([])
  expect(registry.entries.map(entry=>entry.id).sort()).toEqual(['blue-whale-business','miku','whale-girl-refined'])
  expect(registry.defaultEntry().id).toBe('whale-girl-refined')
  const miku = registry.byId('miku')!
  for (const name of PET_ROW_ORDER) expect(miku.frames2d!.tracks[name]?.frames.length, name).toBeGreaterThan(0)
  expect(miku.frames2d!.tracks['running-right']!.frames).toHaveLength(8)
  expect(Object.values(miku.frames2d!.tracks).reduce((sum,track)=>sum+track.frames.length,0)).toBe(128)
  expect(miku.gameplay?.dragState).toBe('drag')
  expect(miku.gameplay?.sleep?.state).toBe('sleep-intro')
  expect(miku.gameplay?.shop?.items).toHaveLength(3)
  for (const pet of registry.entries) {
    expect(pet.frameDensity, pet.id).toBe(1)
    for (const path of pet.servable) expect(existsSync(join(pet.dir,path)),pet.id+':'+path).toBe(true)
  }
  expect(miku.servable).toContain('palettes/gpt/thumb/running-left/frame-1.webp')
  const business = registry.byId('blue-whale-business')!
  expect(business.rows).toEqual([8,8,8,8,8,8,8,8,8])
  expect(imageDimensions(readFileSync(join(business.dir,'spritesheet.webp')))).toEqual({width:1536,height:1152})
  const whale = registry.byId('whale-girl-refined')!
  expect(whale.columns).toBe(32)
  expect(whale.rows.reduce((sum,count)=>sum+count,0)).toBe(252)
  expect(whale.tracks.idle.durations[0]).toBeGreaterThanOrEqual(4000)
  expect(whale.tracks.idle.durations.reduce((a,b)=>a+b,0)).toBeGreaterThanOrEqual(4800)
  for (const animation of PET_ROW_ORDER) {
    // Every action must stay in one coherent drawing cohort. Mixed original
    // and generated frames caused alternating shape, shading and palette flicker.
    expect(new Set(whale.tracks[animation].frames.map(frame=>frame%2)).size).toBe(1)
    if (!animation.startsWith('running-')) expect(business.tracks[animation].frames.every(frame=>frame%2===0)).toBe(true)
    for (const frame of whale.tracks[animation].frames) {
      expect(whaleFramePose(animation,frame,32).scale).toBe(1)
      expect(whaleFramePose(animation,frame,32).planted).toBe(false)
    }
    for (const frame of business.tracks[animation].frames) expect(companionFramePose(business.id,animation,frame).scale).toBe(1)
  }
  expect(business.voice?.overrides.whispers?.categories?.thinking).toEqual([])
})
