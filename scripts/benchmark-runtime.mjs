import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const output = path.join(root, 'output/startup-performance')
const executable = process.argv[2]
if (!executable) throw Error('Supply the installed DSH executable (read only).')
const cache = path.join(output, 'runtime')
const results = []
for (const [name, module, count] of [
  ['before', './before/desktop/companion-runtime.cjs', 2],
  ['after', '../../desktop/companion-runtime.cjs', 3],
]) {
  const { prepareRuntime } = require(path.resolve(output, module))
  for (let run = 1; run <= count; run++) {
    let measurement
    const started = performance.now()
    await prepareRuntime(executable, cache, { onMeasure: value => { measurement = value } })
    const result = { name, run, elapsedMs: Math.round(performance.now() - started), ...measurement }
    results.push(result)
    console.log(JSON.stringify(result))
  }
}
fs.writeFileSync(path.join(output, 'runtime-benchmark.json'), JSON.stringify(results, null, 2) + '\n')
