/** Recover the exact Miku contribution from upstream v0.4.4, with Git blob verification. */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const cli = process.env.DSH_PET_GH_CLI ?? 'C:/Program Files/GitHub CLI/gh.exe'
const run = promisify(execFile)
const repo = 'repos/zhu1090093659/dsh-pet'
const api = async (endpoint) => JSON.parse((await run(cli, ['api', endpoint], {
  windowsHide: true, timeout: 55000, maxBuffer: 4 * 1024 * 1024,
})).stdout)
const treeFile = resolve(root, '../upstream-v0.4.4-tree.json')
const tree = existsSync(treeFile) ? JSON.parse(readFileSync(treeFile, 'utf8').replace(/^\uFEFF/, ''))
  : await api(repo + '/git/trees/v0.4.4?recursive=1')
if (tree.truncated) throw new Error('Upstream tree is incomplete')
const entries = tree.tree.filter(entry => entry.type === 'blob' && entry.path.startsWith('assets/miku/'))
const hashBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex')
let completed = 0
const queue = [...entries]
const report = []
async function worker() {
  while (queue.length) {
    const entry = queue.shift()
    // Preserve the source manifest separately; the runtime manifest adds the new actions.
    const relative = entry.path === 'assets/miku/pet.json' ? 'artwork/miku-v0.4.4/original-pet.json'
      : 'artwork/miku-v0.4.4/original/' + entry.path.slice('assets/miku/'.length)
    const target = resolve(root, relative)
    let bytes = existsSync(target) ? readFileSync(target) : undefined
    if (bytes === undefined && existsSync(resolve(root, entry.path))) {
      const candidate = readFileSync(resolve(root, entry.path))
      if (hashBlob(candidate) === entry.sha) bytes = candidate
    }
    if (bytes === undefined || hashBlob(bytes) !== entry.sha) {
      const blob = await api(repo + '/git/blobs/' + entry.sha)
      bytes = Buffer.from(blob.content, 'base64')
      if (hashBlob(bytes) !== entry.sha) throw new Error('Upstream hash mismatch: ' + entry.path)
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, bytes)
    report.push({ source: entry.path, target: relative, sha: entry.sha, bytes: bytes.length })
    completed += 1
    if (completed % 20 === 0) console.log('Verified Miku source files: ' + completed + '/' + entries.length)
  }
}
await Promise.all(Array.from({ length: 4 }, () => worker()))
writeFileSync(resolve(root, 'artwork/miku-v0.4.4/source-report.json'), JSON.stringify({
  repository: 'https://github.com/zhu1090093659/dsh-pet', ref: 'v0.4.4', tree: tree.sha,
  files: report.sort((a, b) => a.source.localeCompare(b.source)),
}, null, 2) + '\n')
console.log('Recovered and verified ' + report.length + ' original Miku files')
