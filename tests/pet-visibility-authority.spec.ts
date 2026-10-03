/**
 * Issue #1762: turning the pet off in the settings page left it on screen, and
 * a restart changed nothing.
 *
 * The pet keeps two visibility answers that must not be confused:
 *
 * - `visible` is the pet's OWN hide/show intent, persisted in its pet.json and
 *   written by the sprite's hide/summon control and by the aggregate shell's
 *   fallback card.
 * - `enabled` is the plugin master switch, which hides the pet whatever that
 *   own intent says.
 *
 * The effective on-screen state is the conjunction. This suite drives the real
 * resolve-then-apply loop the Host runs (petSettingsSection -> applySettings
 * Section + setEnabled, exactly as src/index.ts syncSettings does) so the
 * coupling is exercised rather than described.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { Context, type Volatile } from '@deepseek-ai/cordis'
import { PetService } from '../src/service.ts'
import { petSettingsSection, type PetFormConfig } from '../src/index.ts'
import { resolvePetManifest, type PetRegistry } from '../src/registry.ts'

/** One-pet registry fixture. */
function fixtureRegistry(): PetRegistry {
  const warnings: string[] = []
  const whale = resolvePetManifest({
    id: 'whale-girl',
    displayName: '鲸鱼娘',
    spritesheetPath: 'spritesheet.webp',
  }, join(tmpdir(), 'whale'), { warnings })
  const entries = [whale!]
  return {
    entries,
    warnings,
    diagnostics: [],
    byId: id => entries.find(entry => entry.id === id),
    defaultEntry: () => entries[0]!,
  }
}

/** A live config reference the Host commits an edit into. */
function liveRef<T extends boolean>(initial: T): Volatile<T> & { set(value: T): void } {
  let value = initial
  return { get: () => value as never, set: (next: T) => { value = next } }
}

let home: string
let service: PetService
const enabled = liveRef<boolean>(true)

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'dsh-pet-visibility-'))
  enabled.set(true)
  service = new PetService(new Context(), { persistDir: home, registry: fixtureRegistry() })
})

afterEach(() => {
  expect(dirname(resolve(home))).toBe(resolve(tmpdir()))
  expect(basename(home).startsWith('dsh-pet-visibility-')).toBe(true)
  rmSync(home, { recursive: true, force: true })
})

/**
 * Apply the row's config the way src/index.ts syncSettings does: resolve the
 * section against the live config and the pet's own persisted intent, then
 * apply the section and the master switch. The pet's own intent is read back
 * from the service, exactly as the production resolve does.
 * @param master - the master switch the row currently carries.
 */
function rearm(master: boolean): void {
  enabled.set(master)
  const config = { visible: liveRef<boolean>(true), enabled } as unknown as PetFormConfig
  const section = petSettingsSection(config, service.selectedPetId(), service.display())
  service.applySettingsSection(section)
  service.setEnabled(section.enabled ?? true)
}

describe('pet master switch vs. the pet own hide/show intent (issue #1762)', () => {
  it('operator turning the plugin off hides the pet without rewriting its own intent', () => {
    // Given a pet the user is showing
    expect(service.display().visible).toBe(true)

    // When the operator switches the plugin off in the settings page
    rearm(false)

    // Then the pet is off screen
    expect(service.isEnabled()).toBe(false)
    // But the pet's own intent is untouched: storing the derived value here is
    // what made the switch irreversible across restarts
    expect(service.display().visible).toBe(true)
  })

  it('operator turns the plugin back on and the pet returns without a second step', async () => {
    // Given the plugin was switched off
    rearm(false)
    expect(service.isEnabled()).toBe(false)

    // When the operator switches it back on
    rearm(true)

    // Then the pet shows again, because its own intent was never overwritten
    expect(service.isEnabled()).toBe(true)
    expect(service.display().visible).toBe(true)
  })

  it('operator hiding from the sprite keeps the pet hidden while the plugin stays on', () => {
    // Given the sprite's own hide
    return service.setVisible(false).then(() => {
      // When the row re-applies its config with the master switch on
      rearm(true)
      // Then the deliberate hide stands: convergence must not resurrect a pet
      // the user hid on purpose
      expect(service.display().visible).toBe(false)
    })
  })

  it('operator summoning the pet back after switching the plugin off and on shows it', async () => {
    // Given a user who hid the pet from the sprite
    await service.setVisible(false)
    // And then switched the plugin off and on, with a restart in between
    rearm(false)
    rearm(true)
    // When they summon it from the sprite input row
    await service.setVisible(true)
    // Then the pet is visible again
    expect(service.display().visible).toBe(true)
  })
})
