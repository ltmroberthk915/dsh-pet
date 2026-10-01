import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..')
const shared = { absWorkingDir: root, bundle: true, sourcemap: false, jsx: 'automatic', target: 'es2022', logLevel: 'warning', loader: { '.module.css': 'local-css' }, define: { 'process.env.NODE_ENV': '"production"' } }
const browserPlugins = [{ name: 'unused-node-imports', setup(builder) {
  builder.onResolve({ filter: /^node:/ }, args => ({ path: args.path, external: true, sideEffects: false }))
} }]
await build({ ...shared, entryPoints: ['src/index.ts'], outfile: 'lib/index.js', platform: 'node', format: 'esm', packages: 'external' })
const client = await build({ ...shared, entryPoints: ['src/client/index.ts'], outfile: 'lib/client.js', platform: 'browser', format: 'cjs', write: false,
  plugins: browserPlugins, external: ['@deepseek-ai/*', 'react', 'react-dom', 'react-dom/*', 'react/*'] })
const js = client.outputFiles.find(f=>f.path.endsWith('.js')).text
if (/require\(["']node:/.test(js)) throw new Error('Node dependency leaked into embedded renderer')
const css = client.outputFiles.find(f=>f.path.endsWith('.css'))?.text || ''
writeFileSync(resolve(root,'lib/client.js'), `window.__ModuleLoader__.load({id:"@linxin666/dsh-pet",factory:function(require){var module={exports:{}};var exports=module.exports;\n${js}\nif(typeof document!=="undefined"){let tag=document.querySelector('style[data-dsh-pet-local]');if(!tag){tag=document.createElement('style');tag.dataset.dshPetLocal='';document.head.appendChild(tag)}tag.textContent=${JSON.stringify(css)}}return module.exports;}});\n`)
await build({ ...shared, entryPoints: ['src/client/desktop-overlay.tsx'], outfile: 'desktop/overlay.js', platform: 'browser', format: 'iife', minify: true, plugins: browserPlugins })
if (/["']node:/.test(readFileSync(resolve(root,'desktop/overlay.js'),'utf8'))) throw new Error('Node dependency leaked into desktop renderer')
const outCss = resolve(root, 'desktop/overlay.css')
writeFileSync(outCss, readFileSync(outCss, 'utf8') + '\n' + readFileSync(resolve(root,'desktop/overlay-base.css'),'utf8'))
console.log('Built host, embedded client, and isolated desktop renderer')
