import { clientBundle } from './shared/tsdown.client.ts'
import { live2dVendorBundle } from './tsdown.live2d-vendor.ts'

/**
 * Maintainer-invoked build (`build:entries`): transpile
 * straight from src without tsc project references, which need the sibling
 * harness checkout that only dev machines and CI have. Types are NOT
 * checked here — `pnpm run typecheck` owns that. The client bundle is
 * emitted too: the modules node half serves lib/client.js to browsers, so a
 * git-installed package ships the committed output without executing hooks.
 */
export default clientBundle('dsh-pet-copilot', [
  'src/index.ts',
  'src/invariant.ts',
], {
  libExternal: ['@deepseek-ai/dsh-settings'],
  companions: [live2dVendorBundle()],
})
