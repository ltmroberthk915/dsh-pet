import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { dshHome } from './dsh-home.ts'
import { petPackageRoot } from './registry.ts'
import type { DesktopCompanion } from './desktop-status.ts'

/** Only the native Windows Host can identify its own Electron executable. */
export function createDesktopCompanion(options: { routes(): WebRoute[]; enabled(): boolean }): DesktopCompanion {
  const root = petPackageRoot(import.meta.url)
  const { createCompanion } = createRequire(import.meta.url)(join(root, 'desktop/companion-host.cjs'))
  const home = dshHome()
  const cacheDir = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'dsh-pet', createHash('sha256').update(home).digest('hex').slice(0, 16))
    : join(home, 'pet-desktop')
  return createCompanion({ ...options, pluginDir: root, cacheDir }) as DesktopCompanion
}
