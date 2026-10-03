/** Strict installation verification in a new profile, cache and package store. */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

export async function verifyInstall(options) {
  const { runtime, desktopExecutable, pnpm, marketBridge, registry, spec, version } = options
  const name = 'dsh-pet-copilot'
  const root = path.resolve('output/release-install-verification')
  fs.mkdirSync(root, { recursive: true })
  const dir = fs.mkdtempSync(path.join(root, 'isolated-'))
  const { Context } = await import(pathToFileURL(path.join(runtime, 'node_modules/@deepseek-ai/cordis/lib/index.js')).href)
  const { PluginManager } = await import(pathToFileURL(path.join(runtime, 'node_modules/@deepseek-ai/dsh-plugin-manager/lib/index.js')).href)
  const { createOfficialDesktopRuntime } = await import(pathToFileURL(marketBridge).href)
  const workspace = ['packages:', '  - .', 'autoInstallPeers: false', 'nodeLinker: hoisted',
    'cacheDir: ' + JSON.stringify(path.join(dir, 'cache')), 'storeDir: ' + JSON.stringify(path.join(dir, 'store')),
    'stateDir: ' + JSON.stringify(path.join(dir, 'state'))]
  const age = options.age ?? 1440
  if (!options.normal) workspace.push('minimumReleaseAge: ' + age)
  if (typeof options.strict === 'boolean') workspace.push('minimumReleaseAgeStrict: ' + options.strict)
  if (options.exclude) workspace.push('minimumReleaseAgeExclude:', '  - ' + name + '@' + version)
  fs.writeFileSync(path.join(dir, 'pnpm-workspace.yaml'), workspace.join('\n') + '\n')
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'pet-isolated-install', private: true, dependencies: {}, dsh: { profile: { bundles: [] } } }))
  fs.writeFileSync(path.join(dir, 'cordis.patch.yml'), '[]\n')
  fs.writeFileSync(path.join(dir, 'empty.npmrc'), '')
  const ctx = new Context()
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', DSH_HOME: path.join(dir, 'home'),
    XDG_CACHE_HOME: path.join(dir, 'xdg-cache'), XDG_STATE_HOME: path.join(dir, 'xdg-state'),
    PNPM_HOME: path.join(dir, 'pnpm-home'), npm_config_userconfig: path.join(dir, 'empty.npmrc'), DSH_TELEMETRY_DISABLED: '1' }
  ctx.provide('profileContext', { name: 'desktop', dir, home: env.DSH_HOME, cwd: dir,
    patchPath: path.join(dir, 'cordis.patch.yml'), installAnchor: path.join(runtime, 'package.json'), startedBundles: [],
    packageManager: { command: desktopExecutable, args: ['--expose-internals', pnpm], env } })
  ctx.provide('loader', { entries: () => [] })
  const manager = new PluginManager(ctx, PluginManager.Config({ registry, fallbackRegistries: [], idleTimeoutMs: 120000 }))
  const bridge = createOfficialDesktopRuntime(() => manager, 'desktop', dir)
  const log = path.join(dir, 'manager.log')
  ctx.on('plugin-manager/install-log', event => { if (event.text) fs.appendFileSync(log, event.text) })
  try {
    let seeded
    if (options.seed) {
      const result = await bridge.runPlugin('desktop', ['add', options.seed.spec])
      const installed = path.join(dir, 'node_modules', name, 'package.json')
      const installedVersion = fs.existsSync(installed) ? JSON.parse(fs.readFileSync(installed, 'utf8')).version : null
      if (result.exitCode !== 0 || installedVersion !== options.seed.version) throw Error('Seed installation failed: ' + JSON.stringify(result))
      seeded = { result, installedVersion }
    }
    const result = await bridge.runPlugin('desktop', ['add', spec])
    const installedFile = path.join(dir, 'node_modules', name, 'package.json')
    const installedVersion = fs.existsSync(installedFile) ? JSON.parse(fs.readFileSync(installedFile, 'utf8')).version : null
    const workspaceAfter = fs.readFileSync(path.join(dir, 'pnpm-workspace.yaml'), 'utf8')
    const { createRequire } = await import('node:module')
    const require = createRequire(path.join(runtime, 'package.json'))
    const policy = require('yaml').parse(workspaceAfter)
    const text = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : ''
    const evidence = { checkedAt: new Date().toISOString(), status: result.exitCode === 0 && installedVersion === version ? 'passed' : 'blocked',
      ...(seeded ? { seed: seeded } : {}),
      name, version, installedVersion, registry: registry.replace(/\/$/, ''), spec, dir,
      source: spec.includes('@file:') ? 'file' : (spec === name || spec.startsWith(name + '@') && !spec.slice(name.length + 1).includes(':')) ? 'registry' : 'tarball',
      minimumReleaseAge: policy.minimumReleaseAge ?? null, exclusions: policy.minimumReleaseAgeExclude ?? [],
      strict: policy.minimumReleaseAgeStrict ?? (!options.normal && age > 0),
      releaseAgeBlocked: /ERR_PNPM_(NO_MATURE_MATCHING_VERSION|MINIMUM_RELEASE_AGE_VIOLATION)/.test(text), result,
      dependency: JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).dependencies?.[name] ?? null }
    if (evidence.status === 'passed' && evidence.source === 'registry') {
      const metadata = await fetch(registry.replace(/\/$/, '') + '/' + name, { signal: AbortSignal.timeout(30000) }).then(response => response.json())
      evidence.integrity = metadata.versions?.[version]?.dist?.integrity
    }
    if (options.repeat && evidence.status === 'passed') {
      const before = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
      const repeated = await bridge.runPlugin('desktop', ['add', spec])
      const after = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
      const installedAfter = JSON.parse(fs.readFileSync(installedFile, 'utf8')).version
      const repeatedPolicy = require('yaml').parse(fs.readFileSync(path.join(dir, 'pnpm-workspace.yaml'), 'utf8'))
      const diagnostic = repeated.stdout + '\n' + repeated.stderr
      evidence.repeat = {
        status: repeated.exitCode === 0 ? 'passed' : 'blocked', result: repeated,
        releaseAgeCode: diagnostic.match(/ERR_PNPM_(?:NO_MATURE_MATCHING_VERSION|MINIMUM_RELEASE_AGE_VIOLATION)/)?.[0] ?? null,
        installedVersion: installedAfter,
        installedVersionPreserved: installedAfter === installedVersion,
        bundleSelectionPreserved: JSON.stringify(after.dsh?.profile?.bundles) === JSON.stringify(before.dsh?.profile?.bundles),
        dependencyPreserved: after.dependencies?.[name] === before.dependencies?.[name],
        exclusions: repeatedPolicy.minimumReleaseAgeExclude ?? [],
      }
    }
    fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(evidence, null, 2) + '\n')
    return evidence
  } finally { await bridge.dispose(); await ctx.fiber.dispose() }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
  const result = await verifyInstall(config)
  fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
  if (result.status !== 'passed') process.exitCode = 2
}
