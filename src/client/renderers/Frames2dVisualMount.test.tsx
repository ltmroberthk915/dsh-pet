// @vitest-environment jsdom
/**
 * Frames2dVisualMount registration contract: the mount consumes the base idle
 * the gameplay HUD latches on the bus. That covers a renderer which mounts
 * after the HUD restored a skin from the host snapshot, and one that remounts
 * later (hidden/summoned, StrictMode double mount) — the pet must repaint the
 * selected skin instead of snapping back to the default look.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { PetDefinition } from '../../registry.ts'
import { createDragStream } from '../drag-stream.ts'
import type { GameplayBus } from '../gameplay-hud.tsx'
import { t } from '../locales.ts'
import { Frames2dVisualMount } from './Frames2dVisualMount.tsx'
import { defaultPetRendererRegistry } from './registry.ts'
import type { PetStateView } from '../../service.ts'

function definition(): PetDefinition {
  return {
    id: 'miku',
    displayName: 'Miku',
    description: '',
    renderer: 'frames2d',
    cell: { width: 100, height: 100 },
    columns: 8,
    rows: [],
    atlasUrl: '/pet/miku/atlas.webp',
    manifestUrl: '/pet/miku/pet.json',
    tracks: {} as PetDefinition['tracks'],
    frames2d: {
      tracks: {
        idle: { frames: ['/pet/miku/idle_1.webp'], durations: [200], loop: true },
        skin: { frames: ['/pet/miku/skin_1.webp'], durations: [200], loop: true },
      },
      phases: { idle: 'idle' },
      skins: [{ id: 'skin', label: 'Skin', idleTrack: 'skin' }],
    },
  } as unknown as PetDefinition
}

function mountWith(bus: GameplayBus): { setIdleTrack: ReturnType<typeof vi.fn> } {
  const handle = { dispose: vi.fn(), setState: vi.fn(), setIdleTrack: vi.fn(), currentTrack: () => 'idle' }
  vi.spyOn(defaultPetRendererRegistry, 'mount')
    .mockReturnValue(handle as unknown as ReturnType<typeof defaultPetRendererRegistry.mount>)
  render(
    <Frames2dVisualMount
      definition={definition()}
      phase="idle"
      onPet={() => undefined}
      drag={createDragStream()}
      bus={bus}
      t={t}
    />,
  )
  return handle
}

describe('Frames2dVisualMount', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('applies the base idle the HUD latched before this mount (restored skin)', () => {
    const handle = mountWith({ idleTrack: 'skin' })
    expect(handle.setIdleTrack).toHaveBeenCalledWith('skin')
  })

  it('leaves the default look alone when no base idle is latched', () => {
    const handle = mountWith({})
    expect(handle.setIdleTrack).not.toHaveBeenCalled()
  })
  it('keeps a grabbed pose when an earlier ambient action ends or the visual remounts', () => {
    const def=definition(), drag=createDragStream(), bus: GameplayBus={}
    def.frames2d!.tracks.drag=def.frames2d!.tracks.idle!
    const handle={dispose:vi.fn(),setState:vi.fn(),setIdleTrack:vi.fn(),currentTrack:()=> 'drag'}
    vi.spyOn(defaultPetRendererRegistry,'mount').mockReturnValue(handle)
    drag.push(true)
    render(<Frames2dVisualMount definition={def} phase="idle" onPet={()=>{}} drag={drag} bus={bus} t={t} />)
    expect(handle.setState).toHaveBeenLastCalledWith('drag')
    bus.setTrack?.('standup')
    bus.setTrack?.(undefined)
    expect(handle.setState).toHaveBeenCalledTimes(1)
    drag.push(false)
    bus.setTrack?.('sleep')
    expect(handle.setState).toHaveBeenLastCalledWith('sleep')
  })

  it('keeps one renderer and decoded cache when per-session footer FPS changes', () => {
    const def = definition()
    def.frames2d!.tracks['running-right'] = def.frames2d!.tracks.idle!
    def.frames2d!.tracks['running-left'] = def.frames2d!.tracks.idle!
    const handle = { dispose:vi.fn(), setState:vi.fn(), setIdleTrack:vi.fn(), setActivityTrack:vi.fn(), setPlaybackFps:vi.fn(), currentTrack:()=> 'running-right' }
    const mount = vi.spyOn(defaultPetRendererRegistry,'mount').mockReturnValue(handle)
    const drag = createDragStream()
    const snapshot = { animation:'running-right', phase:'thinking' } as PetStateView
    const props = { definition:def, phase:'thinking' as const, snapshot, onPet:()=>undefined, drag, t }
    const view = render(<Frames2dVisualMount {...props} fps={12} />)
    view.rerender(<Frames2dVisualMount {...props} fps={25} />)
    expect(mount).toHaveBeenCalledTimes(1)
    expect(handle.dispose).not.toHaveBeenCalled()
    expect(handle.setPlaybackFps).toHaveBeenLastCalledWith(25, undefined, undefined)
    expect(handle.setActivityTrack).toHaveBeenCalledWith('running-right')
  })
})
