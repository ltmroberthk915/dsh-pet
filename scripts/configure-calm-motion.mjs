/** Select coherent drawings without modifying or regenerating image pixels. */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
const root = resolve(import.meta.dirname, '..')
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const before = join(root, 'output/motion-stability/before')
mkdirSync(before, { recursive: true })
const save = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
const backup = path => {
  const target = join(before, path.replaceAll('/', '__'))
  if (!existsSync(target)) copyFileSync(join(root, path), target)
}
const order = ['idle','running-right','running-left','waving','jumping','failed','waiting','running','review']
for (const directory of ['whale-refined', 'blue-whale-business']) {
  const path = `assets/${directory}/pet.json`
  backup(path)
  const manifest = JSON.parse(readFileSync(join(before, path.replaceAll('/', '__')), 'utf8'))
  const whale = directory === 'whale-refined'
  for (const [row, name] of order.entries()) {
    const old = manifest.sprite2d.tracks[name]
    const count = manifest.sprite2d.frames[row]
    const swimming = name.startsWith('running-')
    // Whale running: one coherent new drawing cohort. Standing: original art.
    // Business swimming was generated as one complete loop, so keep all of it.
    const frames = Array.from({length: swimming && !whale ? count : count / 2},
      (_, i) => swimming && !whale ? i : 2 * i + (swimming && whale ? 1 : 0))
    const durations = frames.map((_, i) => swimming ? 160
      : Math.max(name === 'failed' ? 220 : 180, (old.durations[2*i] ?? 180) + (old.durations[2*i+1] ?? 180)))
    manifest.sprite2d.tracks[name] = { ...old, frames, durations }
  }
  if (whale) {
    // A long rest plus one short blink. Never cycle the whole body while idle.
    manifest.sprite2d.tracks.idle = { frames: [20, 12, 14, 18], durations: [4600, 90, 140, 90], loop: true }
    manifest.sprite2d.tracks.waiting = { frames: [0, 2, 4, 2], durations: [1800, 450, 700, 450], loop: true }
    manifest.sprite2d.tracks.running = { frames: [0, 2, 4, 2], durations: [1400, 400, 600, 400], loop: true }
    manifest.sprite2d.tracks.review = { frames: [0, 2, 4, 2], durations: [1800, 500, 700, 500], loop: true }
  } else {
    manifest.sprite2d.tracks.idle.durations = [1600, 700, 700, 1000]
    for (const name of ['waiting','running','review']) manifest.sprite2d.tracks[name].durations = [1600,650,650,1100]
  }
  manifest.version = version
  manifest.frameDensity = 1
  save(join(root,path), manifest)
}
// The same alternating-source defect exists in MIKU's inserted frames.
const mikuPath = 'assets/miku/pet.json'
backup(mikuPath)
const miku = JSON.parse(readFileSync(join(before,mikuPath.replaceAll('/','__')), 'utf8'))
for (const track of Object.values(miku.frames2d.tracks)) {
  const durations = track.frameMs
  track.frames = track.frames.filter((_,i) => i % 2 === 0)
  track.frameMs = durations.filter((_,i) => i % 2 === 0).map((ms,i) => Math.max(100, ms + (durations[2*i+1] ?? ms)))
}
miku.version = version
miku.frameDensity = 1
save(join(root,mikuPath),miku)
backup('package.json')
const pkg = JSON.parse(readFileSync(join(root,'package.json'),'utf8'))
pkg.version = version
save(join(root,'package.json'),pkg)
console.log('Configured coherent motion timelines for three companions; image assets unchanged.')
