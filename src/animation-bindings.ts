import type { PetAnimation, PetStateSnapshot } from './state.ts'

/** The bundled companions share the same session and tool motion vocabulary. */
export function sessionMotionPet(petId: string): boolean {
  return ['whale-girl-refined', 'miku', 'blue-whale-business'].includes(petId)
}

/** Keep other installed characters' phase mappings intact. */
export function boundAnimation(petId: string, snapshot: PetStateSnapshot): PetAnimation {
  if (!sessionMotionPet(petId)) return snapshot.animation
  if (snapshot.generation !== undefined) {
    return snapshot.generation === 'tool-arguments' && (snapshot.toolCategory === 'write' || snapshot.toolCategory === 'edit')
      ? 'running-left' : 'running-right'
  }
  if (snapshot.phase === 'thinking' && snapshot.toolKind === 'result') return 'review'
  if (snapshot.phase === 'tool') {
    if (snapshot.toolKind === 'command' || snapshot.toolCategory === 'shell') return 'running'
    if (['read', 'grep', 'find', 'ls', 'memory'].includes(snapshot.toolCategory ?? '')) return 'review'
    if (snapshot.toolCategory === 'ask') return 'waiting'
    return 'running-left'
  }
  return snapshot.animation
}

/** Use structured tool names, never assistant prose or the content of scripts. */
export function commandTool(name: string): boolean {
  return /(?:^|[_.:/-])(?:exec(?:_command)?|run_command|run_code|bash|shell|terminal|powershell|pwsh|write_stdin|ssh)(?:$|[_.:/-])/i.test(name)
}
