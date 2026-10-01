import type { PetAnimation, PetStateSnapshot } from './state.ts'

/** This artwork-specific mapping must not change other characters' poses. */
export function boundAnimation(petId: string, snapshot: PetStateSnapshot): PetAnimation {
  if (petId !== 'whale-girl-refined') return snapshot.animation
  if (snapshot.phase === 'thinking') return 'running-right'
  if (snapshot.phase === 'tool' && snapshot.toolKind === 'command') return 'running'
  return snapshot.animation
}

/** Use structured tool names, never assistant prose or the content of scripts. */
export function commandTool(name: string): boolean {
  return /(?:^|[_.:/-])(?:exec(?:_command)?|run_command|run_code|bash|shell|terminal|powershell|pwsh|write_stdin|ssh)(?:$|[_.:/-])/i.test(name)
}
