/** Create canonical/legacy archives, migration ZIP and checksums from one verified pack. */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
const root = path.resolve(import.meta.dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const receipt = JSON.parse(fs.readFileSync(path.join(root, 'output/companion-verification/package-results.json'), 'utf8'))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const canonical = pkg.name + '-' + pkg.version + '.tgz'
const archive = fs.readFileSync(path.join(root, 'output', canonical))
if (receipt.status !== 'passed' || receipt.version !== pkg.version || receipt.name !== pkg.name || receipt.sha256 !== hash(archive)) throw Error('A matching, verified package is required')
const dest = path.join(root, 'output/release-v' + pkg.version)
fs.mkdirSync(dest, { recursive: true })
fs.writeFileSync(path.join(dest, canonical), archive)
fs.writeFileSync(path.join(dest, 'dsh-session-pet.tgz'), archive)

// A small, dependency-free ZIP (stored UTF-8 entries), readable by Windows
// Explorer/Expand-Archive without installing a separate developer runtime.
const crc32 = bytes => {
  let crc = 0xffffffff
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0) }
  return (crc ^ 0xffffffff) >>> 0
}
const zip = entries => {
  const locals = [], centrals = []
  let offset = 0
  for (const [name, data] of entries) {
    const filename = Buffer.from(name), crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6)
    local.writeUInt16LE(33, 12); local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8)
    central.writeUInt16LE(33, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42)
    locals.push(local, filename, data); centrals.push(central, filename)
    offset += local.length + filename.length + data.length
  }
  const directory = Buffer.concat(centrals), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}
const migration = 'dsh-pet-profile-migration-' + pkg.version + '.zip'
const paths = ['scripts/migrate-profile.mjs', 'scripts/migrate-profile.ps1', 'scripts/migrate-profile.cmd', 'docs/fresh-install-v1.3.3.md']
fs.writeFileSync(path.join(dest, migration), zip(paths.map(file => [path.basename(file), fs.readFileSync(path.join(root, file))])))
const names = [canonical, 'dsh-session-pet.tgz', migration]
const sums = names.map(file => hash(fs.readFileSync(path.join(dest, file))) + '  ' + file).join('\n') + '\n'
fs.writeFileSync(path.join(dest, 'SHA256SUMS.txt'), sums)
fs.copyFileSync(path.join(root, 'docs/release-notes/v' + pkg.version + '.md'), path.join(dest, 'release-notes.md'))
console.log(JSON.stringify({ version: pkg.version, directory: dest, files: names, sha256: hash(archive), bytes: archive.length }, null, 2))
