import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { AssistantStreamFrame } from '@deepseek-ai/dsh-agent'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { emptyProjectionRuntime, projectAssistantStreamFrame, projectOfficialEvent } from './event-projection.ts'
import { PetStateMachine, type PetStateInput } from './state.ts'
import { boundAnimation } from './animation-bindings.ts'
import { effectiveFps, retimeTracks } from './animation.ts'
import { normalizeVoicePack } from './voice-pack.ts'
import { STATUS_SCENES, TOOL_CATEGORIES, WHISPER_CATEGORIES, toolCategory } from './chatter.ts'

function fixture() {
  const runtime = emptyProjectionRuntime()
  const machine = new PetStateMachine()
  let revision = 0
  const accept = (transition: { input: PetStateInput } | undefined) => {
    if (transition) machine.onActivityStatus(transition.input)
    return { ...machine.render(), animation: boundAnimation('whale-girl-refined', machine.render()) }
  }
  return {
    runtime,
    start: (attemptId = 'a') => accept(projectAssistantStreamFrame({ type: 'start', attemptId, revision: ++revision, turn: 1, step: 1 } as AssistantStreamFrame, runtime)),
    chunk: (chunk: unknown, attemptId = 'a') => accept(projectAssistantStreamFrame({ type: 'chunk', attemptId, revision: ++revision, index: revision, time: revision, chunk } as AssistantStreamFrame, runtime)),
    end: (attemptId = 'a') => accept(projectAssistantStreamFrame({ type: 'end', attemptId, revision: ++revision, index: revision, outcome: { kind: 'abandoned' } } as AssistantStreamFrame, runtime)),
    event: (type: string, data: unknown) => accept(projectOfficialEvent({ type, data } as SessionEvent, runtime)),
  }
}

describe('model generation motion and stream boundaries', () => {
  it('runs right for both reasoning and answer text, including code in an answer', () => {
    const f = fixture()
    expect(f.start()).toMatchObject({ animation: 'waiting', generation: undefined })
    expect(f.chunk({ type: 'reasoning-delta', text: '分析', index: 0 })).toMatchObject({ animation: 'running-right', generation: 'reasoning' })
    expect(f.chunk({ type: 'text-delta', text: '```ts\nconst x = 1', index: 1 })).toMatchObject({ animation: 'running-right', generation: 'text' })
    expect(f.end().generation).toBeUndefined()
  })

  it.each(['write_file', 'create_file', 'save_file', 'edit_file', 'apply_patch', 'str_replace_editor', 'mcp__filesystem__write_file', 'mcp__filesystem__edit_file'])('runs left for %s argument generation and remembers names across chunks', name => {
    const f = fixture()
    f.start()
    const first = f.chunk({ type: 'tool-call-delta', index: 0, id: 'file', name, argumentsDelta: '{' })
    expect(first).toMatchObject({ animation: 'running-left', generation: 'tool-arguments' })
    expect(f.chunk({ type: 'tool-call-delta', index: 0, id: 'file', argumentsDelta: '"content":"code"}' })).toMatchObject({ animation: 'running-left', generation: 'tool-arguments' })
    f.end()
    expect(f.event('tool/call', { callId: 'file', name, arguments: '{}' })).toMatchObject({ animation: 'running-left', generation: undefined })
  })

  it('keeps other tool arguments token-aware, then restores command execution posture', () => {
    const f = fixture(); f.start()
    expect(f.chunk({ type: 'tool-call-delta', index: 0, id: 'cmd', name: 'exec_command', argumentsDelta: 'echo hello' })).toMatchObject({ animation: 'running-right', generation: 'tool-arguments' })
    f.end()
    expect(f.event('tool/call', { callId: 'cmd', name: 'exec_command', arguments: 'echo hello' })).toMatchObject({ animation: 'running', generation: undefined })
    expect(f.event('tool/result', { message: { toolCallId: 'cmd', content: [{ type: 'text', text: 'reasoning and many tokens' }] } })).toMatchObject({ animation: 'review', generation: undefined })
    f.start('b')
    expect(f.chunk({ type: 'reasoning-delta', index: 0, text: '继续思考' }, 'b')).toMatchObject({ animation: 'running-right', generation: 'reasoning' })
  })

  it('does not let a parallel tool result or stale stream end interrupt new generation', () => {
    const f = fixture()
    f.event('tool/call', { callId: 'read', name: 'read_file', arguments: '{}' })
    f.start(); f.chunk({ type: 'text-delta', index: 0, text: 'output' })
    expect(f.event('tool/result', { message: { toolCallId: 'read' } })).toMatchObject({ animation: 'running-right', generation: 'text' })
    f.start('b')
    f.chunk({ type: 'tool-call-delta', index: 0, id: 'edit', name: 'edit_file', argumentsDelta: '{' }, 'b')
    expect(f.end('a')).toMatchObject({ animation: 'running-left', generation: 'tool-arguments' })
    expect(f.end('b').generation).toBeUndefined()
  })

  it('tracks tool identities independently, resolves a late name, and ignores empty / usage frames', () => {
    const f = fixture(); f.start()
    expect(f.chunk({ type: 'text-delta', index: 0, text: '' }).generation).toBeUndefined()
    expect(f.chunk({ type: 'usage', usage: {} }).generation).toBeUndefined()
    expect(f.chunk({ type: 'tool-call-delta', index: 0, id: 'write', argumentsDelta: '{' }).animation).toBe('running-right')
    expect(f.chunk({ type: 'tool-call-delta', index: 0, id: 'write', name: 'write_file', argumentsDelta: '' }).animation).toBe('running-left')
    expect(f.chunk({ type: 'tool-call-delta', index: 1, id: 'read', name: 'read_file', argumentsDelta: '{' }).animation).toBe('running-right')
    expect(f.chunk({ type: 'tool-call-delta', index: 0, id: 'write', argumentsDelta: 'more' }).animation).toBe('running-left')
    expect(f.chunk({ type: 'finish', reason: { kind: 'stop' } }).generation).toBeUndefined()
  })

  it('stops immediately on abort and cannot restart from a late chunk', () => {
    const f = fixture(); f.start(); f.chunk({ type: 'reasoning-delta', index: 0, text: 'x' })
    expect(f.event('turn/end', { reason: { kind: 'aborted' } })).toMatchObject({ animation: 'idle', generation: undefined })
    expect(f.chunk({ type: 'text-delta', index: 1, text: 'late' }).animation).toBe('idle')
    f.event('turn/start', { turn: 2 }); f.start('b')
    expect(f.chunk({ type: 'text-delta', index: 0, text: 'new' }, 'b').animation).toBe('running-right')
  })

  it('does not clear or close generation on a repeated start notification', () => {
    const f = fixture(); f.start(); f.chunk({ type: 'reasoning-delta', index: 0, text: 'first' })
    expect(f.start().generation).toBe('reasoning')
    expect(f.chunk({ type: 'text-delta', index: 1, text: 'second' }).generation).toBe('text')
  })

  it('retimes either running direction while retaining all other track durations', () => {
    const tracks = { 'running-right': { durations: [300, 400] }, 'running-left': { durations: [300, 400] }, running: { durations: [250, 350] } }
    const fps = effectiveFps({ animationMode: 'tick', animationTickSlope: .1, animationTickIntercept: 5 }, 150)
    expect(fps).toBe(20)
    for (const direction of ['running-right', 'running-left'] as const) {
      const result = retimeTracks(tracks, fps, direction)
      expect(result[direction].durations).toEqual([50, 50])
      expect(result.running).toBe(tracks.running)
      expect(result[direction === 'running-left' ? 'running-right' : 'running-left'].durations).toEqual([300, 400])
    }
    expect(retimeTracks(tracks, undefined, 'running-left')).toBe(tracks)
  })

  it.each([['read_file', 'review'], ['grep', 'review'], ['memory_recall', 'review'], ['web_search', 'running-left'], ['browser_click', 'running-left'], ['git_status', 'running-left'], ['ask_user', 'waiting'], ['subagent', 'running-left']])('uses the distinct execution posture for %s', (name, animation) => {
    const state = fixture().event('tool/call', { callId: 'c', name, arguments: '{}' })
    expect(state.animation).toBe(animation)
    expect(state.generation).toBeUndefined()
    expect(state.waveKey).toBe(name === 'ask_user' || name === 'subagent' ? 'c' : undefined)
  })
})

it('loads the concise whale voice without losing any scene, tool, whisper, result or interaction category', () => {
  const warnings: string[] = []
  const raw = JSON.parse(readFileSync(new URL('../assets/whale-refined/voice.json', import.meta.url), 'utf8'))
  const voice = normalizeVoicePack(raw, message => warnings.push(message))!
  expect(warnings).toEqual([])
  const pools = voice.overrides
  for (const key of STATUS_SCENES) expect(pools.status?.[key]?.length).toBe(3)
  for (const key of TOOL_CATEGORIES) expect(pools.tools?.[key]?.length).toBe(3)
  for (const key of WHISPER_CATEGORIES) expect(pools.whispers?.categories?.[key]?.length).toBe(3)
  for (const key of ['pass', 'fail', 'done'] as const) expect(pools.whispers?.results?.[key]?.length).toBe(3)
  for (const key of ['pet', 'petCooldown', 'feed', 'feedCooldown', 'noTreats'] as const) expect(voice.remarks?.[key]?.length).toBe(3)
  expect(toolCategory('browser_click')).toBe('browser')
  expect(toolCategory('browserFetch')).toBe('webFetch')
  expect(toolCategory('write_stdin')).toBe('shell')
})
