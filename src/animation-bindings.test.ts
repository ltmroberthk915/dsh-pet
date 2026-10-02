import { expect, it } from 'vitest'
import { boundAnimation, commandTool } from './animation-bindings.ts'
import type { PetStateSnapshot } from './state.ts'

it('classifies command tools using their names, without confusing file writes or other tools', () => {
  for (const name of ['exec_command', 'functions.exec', 'tools.bash', 'mcp__terminal__execute', 'run_command', 'write_stdin', 'powershell', 'pwsh']) expect(commandTool(name), name).toBe(true)
  for (const name of ['write_file', 'apply_patch', 'read_file', 'search', 'browser_click', 'describe_command']) expect(commandTool(name), name).toBe(false)
})

it('gives all three bundled companions the same generation and tool gestures', () => {
  const cases: [Partial<PetStateSnapshot>, string][] = [
    [{ generation: 'reasoning' }, 'running-right'],
    [{ generation: 'text' }, 'running-right'],
    [{ generation: 'tool-arguments', toolCategory: 'write' }, 'running-left'],
    [{ generation: 'tool-arguments', toolCategory: 'edit' }, 'running-left'],
    [{ phase: 'tool', toolKind: 'command' }, 'running'],
    [{ phase: 'tool', toolCategory: 'read' }, 'review'],
    [{ phase: 'tool', toolCategory: 'ask' }, 'waiting'],
    [{ phase: 'thinking', toolKind: 'result' }, 'review'],
    [{ phase: 'done', animation: 'jumping' }, 'jumping'],
  ]
  for (const id of ['whale-girl-refined', 'miku', 'blue-whale-business']) {
    for (const [motion, expected] of cases) {
      expect(boundAnimation(id, { animation: 'idle', phase: 'idle', sessionActive: true, animationStartedAt: 0, ...motion }), id).toBe(expected)
    }
  }
  expect(boundAnimation('custom-cat', { animation: 'idle', phase: 'tool', sessionActive: true, animationStartedAt: 0, generation: 'text' })).toBe('idle')
})
