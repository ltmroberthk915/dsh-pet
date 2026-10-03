import { defineConfig } from 'vitest/config'
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: { globals: false, maxWorkers: 2, exclude: ['node_modules/**', 'lib/**', 'output/**'], testTimeout: 15000 },
})
