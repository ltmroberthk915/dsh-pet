import { defineConfig } from 'vitest/config'
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: { include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.spec.ts', 'tests/**/*.spec.tsx'], globals: false, maxWorkers: 2, exclude: ['node_modules/**', 'lib/**', 'output/**'], testTimeout: 15000 },
})
