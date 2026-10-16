import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { test } from 'node:test'
const { prepareRuntime } = createRequire(import.meta.url)('../desktop/companion-runtime.cjs')
const output = path.resolve(import.meta.dirname, '../output/startup-performance')
await fs.mkdir(output, { recursive: true })

async function fixture() {
  const dir = await fs.mkdtemp(path.join(output, 'cache-test-'))
  const source = path.join(dir, 'host'), cache = path.join(dir, 'cache')
  await fs.mkdir(path.join(source, 'locales'), { recursive: true })
  const files = ['DeepSeek Harness.exe', 'chrome_100_percent.pak', 'chrome_200_percent.pak', 'd3dcompiler_47.dll',
    'ffmpeg.dll', 'icudtl.dat', 'resources.pak', 'v8_context_snapshot.bin', 'locales/en-US.pak']
  for (const name of files) await fs.writeFile(path.join(source, name), 'fixture:' + name)
  return { dir, source, cache, exe: path.join(source, files[0]) }
}

test('unchanged runtimes skip bulk reads and still check bootstrap contents', async () => {
  const f = await fixture()
  let first, second
  const exe = await prepareRuntime(f.exe, f.cache, { onMeasure: v => { first = v } })
  assert.ok(first.bytesHashed > 0)
  assert.equal(await prepareRuntime(f.exe, f.cache, { onMeasure: v => { second = v } }), exe)
  assert.equal(second.bytesHashed, 0)
  assert.equal(second.filesHashed, 0)
  await fs.appendFile(path.join(path.dirname(exe), 'resources/app/main.cjs'), '// changed')
  await assert.rejects(prepareRuntime(f.exe, f.cache), /bootstrap checksum/)
})

test('same-size source writes with restored mtime select a new verified runtime', async () => {
  const f = await fixture(), first = await prepareRuntime(f.exe, f.cache)
  const file = path.join(f.source, 'ffmpeg.dll'), stat = await fs.stat(file)
  const bytes = await fs.readFile(file); bytes[0] ^= 1
  await fs.writeFile(file, bytes); await fs.utimes(file, stat.atime, stat.mtime)
  const second = await prepareRuntime(f.exe, f.cache)
  assert.notEqual(second, first)
  assert.deepEqual(await fs.readFile(path.join(path.dirname(second), 'ffmpeg.dll')), bytes)
})

test('modified cached executable is rejected even when size and mtime match', async () => {
  const f = await fixture(), exe = await prepareRuntime(f.exe, f.cache), stat = await fs.stat(exe)
  const bytes = await fs.readFile(exe); bytes[0] ^= 1
  await fs.writeFile(exe, bytes); await fs.utimes(exe, stat.atime, stat.mtime)
  await assert.rejects(prepareRuntime(f.exe, f.cache), /cache checksum mismatch/)
})

test('a truncated index is reverified and missing runtime files fail safely', async () => {
  const f = await fixture(), first = await prepareRuntime(f.exe, f.cache)
  await fs.writeFile(path.join(f.cache, 'verified-runtime.json'), '{')
  assert.equal(await prepareRuntime(f.exe, f.cache), first)
  await fs.unlink(path.join(path.dirname(first), 'ffmpeg.dll'))
  await assert.rejects(prepareRuntime(f.exe, f.cache), { code: 'ENOENT' })
  assert.ok((await fs.readFile(path.join(f.source, 'ffmpeg.dll'))).length > 0)
})

test('a redirected cache directory cannot bypass containment checks', async () => {
  const f = await fixture(), exe = await prepareRuntime(f.exe, f.cache), target = path.dirname(exe)
  const moved = target + '-moved'
  await fs.rename(target, moved)
  await fs.symlink(moved, target, 'junction')
  await assert.rejects(prepareRuntime(f.exe, f.cache), /must not redirect/)
})

test('startup defers disk work, cancels when disabled, and releases early for a connected UI', async () => {
  const { createCompanion } = createRequire(import.meta.url)('../desktop/companion-host.cjs')
  const f = await fixture()
  let calls = 0
  const companion = createCompanion({ pluginDir: path.resolve(import.meta.dirname, '..'),
    appExecutable: f.exe, cacheDir: f.cache, routes: () => [], enabled: () => true,
    startupDelayMs: 100, prepareRuntime: async () => { calls++; throw Error('fixture stopped before spawning') },
  })
  try {
    companion.configure({ enabled: true })
    assert.equal(calls, 0)
    companion.configure({ enabled: false })
    await new Promise(resolve => setTimeout(resolve, 120))
    assert.equal(calls, 0)
    companion.configure({ enabled: true, currentSessionId: '' })
    await new Promise(resolve => setTimeout(resolve, 30))
    assert.equal(calls, 1)
    assert.equal(companion.status().state, 'error')
  } finally { companion.dispose() }
})

test('re-enabling during cancelled preparation starts a fresh attempt', async () => {
  const { createCompanion } = createRequire(import.meta.url)('../desktop/companion-host.cjs')
  const f = await fixture()
  let calls = 0, release
  const companion = createCompanion({ pluginDir: path.resolve(import.meta.dirname, '..'),
    appExecutable: f.exe, cacheDir: f.cache, routes: () => [], enabled: () => true, startupDelayMs: 0,
    prepareRuntime: async () => {
      calls++
      if (calls === 1) return new Promise(resolve => { release = resolve })
      throw Error('fixture stopped before spawning')
    },
  })
  try {
    companion.configure({ enabled: true })
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(calls, 1)
    companion.configure({ enabled: false })
    companion.configure({ enabled: true })
    release('unused.exe')
    await new Promise(resolve => setTimeout(resolve, 30))
    assert.equal(calls, 2)
    assert.equal(companion.status().state, 'error')
  } finally { companion.dispose() }
})
