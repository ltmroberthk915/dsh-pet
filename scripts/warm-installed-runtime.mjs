import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const home = path.join(process.env.USERPROFILE, '.dsh')
const plugin = path.join(home, 'profiles/desktop/node_modules/dsh-pets-multiworkers')
const { prepareRuntime } = createRequire(import.meta.url)(path.join(plugin, 'desktop/companion-runtime.cjs'))
const measurements = []
for (let run = 1; run <= 2; run++) {
  await prepareRuntime(process.argv[2], path.join(home, 'cache/pet-desktop/runtime'), {
    onMeasure: value => { measurements.push({ run, ...value }); console.log(JSON.stringify({ run, ...value })) },
  })
}
fs.writeFileSync(path.resolve(import.meta.dirname, '../output/startup-performance/installed-runtime.json'), JSON.stringify(measurements, null, 2) + '\n')
