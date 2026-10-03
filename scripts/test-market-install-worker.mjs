/** Child process for the fresh-profile integration check. Never uses the real DSH home. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const [file, mode] = process.argv.slice(2)
const config = JSON.parse(fs.readFileSync(file, 'utf8'))
assert.equal(process.env.DSH_HOME, config.home)
assert.ok(path.resolve(config.home).startsWith(path.resolve(import.meta.dirname, '../output/market-install-verification') + path.sep))
const { runProfile, prepareProfile } = await import(pathToFileURL(path.join(config.runtime, 'node_modules/@deepseek-ai/dsh/lib/profile-boot.js')))
const { initProfile, loadLayeredEnv } = await import(pathToFileURL(path.join(config.runtime, 'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')))
if (mode !== 'restart') {
  initProfile(path.join(config.home, 'profiles/desktop'), ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'])
}
const profile = prepareProfile('desktop')
if (mode !== 'restart') {
  fs.writeFileSync(path.join(profile.dir, 'pnpm-workspace.yaml'), 'strictDepBuilds: true\nminimumReleaseAge: 1440\n')
}
const app = await runProfile({
  environment: loadLayeredEnv('dsh'), profile: 'desktop', patchFiles: [], args: ['--no-open', '--port', '0'],
  packageManager: {
    command: process.execPath, args: ['--expose-internals', path.join(config.support, 'pnpm/bin/pnpm.mjs')],
    env: { DSH_HOME: config.home, DSH_TELEMETRY_DISABLED: '1' },
  },
})
const result = { checks: [] }
function check(label, actual) { assert.ok(actual, label); result.checks.push(label) }
async function state() {
  const response = await fetch(`http://127.0.0.1:${app.ctx.webServer.port}/api/pet/state`)
  check('pet host responds with HTTP 200', response.status === 200)
  return response.json()
}
try {
  if (mode !== 'restart') {
    const { createOfficialDesktopRuntime } = await import(pathToFileURL(config.marketBridge))
    const manager = app.ctx.pluginManager
    const applications = []
    const runtime = createOfficialDesktopRuntime(() => ({
      async installBundle(spec, options) {
        const outcome = await manager.installBundle(spec, { ...options, registry: config.registry })
        applications.push(outcome.application)
        if (outcome.application === 'failed') console.error(JSON.stringify(outcome))
        return outcome
      },
      removeBundle: (...args) => manager.removeBundle(...args),
      cancelInstall: (...args) => manager.cancelInstall(...args),
    }), 'desktop', profile.dir)
    try {
      const firstName = mode === 'fresh-current' ? config.name : config.names[0]
      const firstVersion = mode === 'fresh-current' ? config.versions[1] : config.versions[0]
      const stages = [['first install', firstName, firstVersion], ['repeat install', firstName, firstVersion]]
      if (mode === 'install') stages.push(['upgrade', config.name, config.versions[1]])
      for (const [label, packageName, version] of stages) {
        if (label === 'upgrade' && firstName !== packageName) {
          const removed = await runtime.runPlugin('desktop', ['remove', firstName])
          if (removed.exitCode) console.error(JSON.stringify(removed))
          check('former package can be removed through the official bridge before name migration', removed.exitCode === 0)
        }
        console.log('Checking ' + label + ' ' + version)
        const installed = await runtime.runPlugin('desktop', ['add', packageName + '@' + version])
        if (installed.exitCode) console.error(JSON.stringify(installed))
        check(label + ' succeeds through the official desktop market bridge', installed.exitCode === 0)
        const deps = JSON.parse(fs.readFileSync(path.join(profile.dir, 'package.json'))).dependencies
        check(label + ' records a registry version', /^[~^]?\d+\.\d+\.\d+$/.test(deps[packageName]))
        if (label === 'first install') {
          const snapshot = await state()
          check('fresh pet starts with a built-in character', snapshot.pet.id === 'whale-girl-refined')
          const save = await fetch(`http://127.0.0.1:${app.ctx.webServer.port}/api/pet/set-name`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '安装回归鲸鱼' }),
          })
          check('fresh host can persist care data without a settings-file edit', save.ok)
        }
      }
      if (mode === 'install' && firstName === config.name) check('upgrade reports restart-required rather than pretending it hot-reloaded', applications.at(-1) === 'restart-required')
      const fileSpec = config.name + '@file:' + config.currentArchive.replaceAll('\\', '/')
      for (const [label, spec] of [['named offline package', fileSpec], ['repeat named offline package', fileSpec], ['return to registry version', config.name + '@' + config.versions[1]]]) {
        console.log('Checking ' + label)
        const installed = await runtime.runPlugin('desktop', ['add', spec])
        if (installed.exitCode) console.error(JSON.stringify(installed))
        check(label + ' succeeds without ambiguous-install', installed.exitCode === 0)
      }
      result.applications = applications
    } finally { await runtime.dispose() }
  } else {
    const snapshot = await state()
    check('pet data survives upgrade and restart', snapshot.name === '安装回归鲸鱼' || snapshot.pet.name === '安装回归鲸鱼')
    const pkg = JSON.parse(fs.readFileSync(path.join(profile.dir, 'node_modules', config.name, 'package.json')))
    check('restarted host resolves the new release', pkg.version === config.versions[1])
    check('consumer needs no build hook or package manager', !pkg.scripts && !pkg.packageManager && !pkg.devDependencies)
    const loader = fs.readFileSync(path.join(profile.dir, 'node_modules', config.name, 'lib/client.js'), 'utf8')
    check('browser module identity matches the new npm package name', loader.startsWith(`window.__ModuleLoader__.load({id:${JSON.stringify(config.name)},`))
    const deps = JSON.parse(fs.readFileSync(path.join(profile.dir, 'package.json'))).dependencies
    check('name migration leaves only the new pet package installed', config.names[0] === config.name || !deps[config.names[0]])
    check('pet settings namespace is mounted', app.ctx.settings.describe().some(row => row.ns === 'pet'))
    const response = await fetch(`http://127.0.0.1:${app.ctx.webServer.port}/api/pet/pets`)
    const pets = await response.json()
    check('all three characters are available after restart', pets.length === 3)
    check('upgraded users receive quiet hover by default', snapshot.display.hoverPanelEnabled === false)
    check('running has no automatic limit after migration', snapshot.display.animationRunFpsLimit === 0)
    for (const settings of [{ animationFps: 294, animationRunFpsLimit: 30, animationActionFps: 144 }, { animationFps: 294, animationRunFpsLimit: 0, animationActionFps: 6 }]) {
      const response = await fetch(`http://127.0.0.1:${app.ctx.webServer.port}/api/pet/set-config`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings),
      })
      const saved = await response.json()
      check('real host persists independent action FPS ' + settings.animationActionFps, response.ok && Object.entries(settings).every(([key, value]) => saved.display[key] === value))
    }
    for (const enabled of [true, false]) {
      const response = await fetch(`http://127.0.0.1:${app.ctx.webServer.port}/api/pet/set-config`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hoverPanelEnabled: enabled }),
      })
      check('real host persists hover panel switch ' + enabled, response.ok && (await response.json()).display.hoverPanelEnabled === enabled)
    }
  }
  fs.writeFileSync(path.join(config.dir, mode + '.json'), JSON.stringify(result, null, 2) + '\n')
} finally { await app.ctx.fiber.dispose() }
