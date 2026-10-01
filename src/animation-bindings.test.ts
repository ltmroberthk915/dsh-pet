import { expect, it } from 'vitest'
import { commandTool } from './animation-bindings.ts'

it('classifies command tools using their names, without confusing file writes or other tools', () => {
  for (const name of ['exec_command', 'functions.exec', 'tools.bash', 'mcp__terminal__execute', 'run_command', 'write_stdin', 'powershell', 'pwsh']) expect(commandTool(name), name).toBe(true)
  for (const name of ['write_file', 'apply_patch', 'read_file', 'search', 'browser_click', 'describe_command']) expect(commandTool(name), name).toBe(false)
})
