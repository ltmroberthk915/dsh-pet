import { createRequire } from 'node:module';
import { join } from 'node:path';
import { dshHome } from "./dsh-home.js";
import { petPackageRoot } from "./registry.js";
/** Only the native Windows Host can identify its own Electron executable. */
export function createDesktopCompanion(options) {
    const root = petPackageRoot(import.meta.url);
    const { createCompanion } = createRequire(import.meta.url)(join(root, 'desktop/companion-host.cjs'));
    const home = dshHome();
    // Windows Store launchers can virtualize individual AppData files while
    // realpath(parent) still names the physical directory. Keep the private
    // runtime under DSH's data root so strict containment/hash checks remain valid.
    const cacheDir = join(home, 'cache', 'pet-desktop');
    return createCompanion({ ...options, pluginDir: root, cacheDir });
}
