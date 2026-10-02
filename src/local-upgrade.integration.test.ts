import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'
import { mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { PetService } from './service.ts'
import { makePetRoutes } from './routes.ts'
import { loadPetRegistry, petPackageRoot } from './registry.ts'

describe('installed desktop plugin integration', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pet-upgrade-'))
  const ctx = new Context()
  const registry = loadPetRegistry({ packageRoot: petPackageRoot(import.meta.url), petsDir: '', dshPetsDir: '' })
  const service = new PetService(ctx, { registry, persistDir: dir })
  const routes = makePetRoutes({ service, ctx })
  let base = ''
  const server = createServer((req, res) => {
    const path = new URL(req.url!, 'http://localhost').pathname
    const route = routes.find(r => r.kind === 'exact' ? r.path === path : path.startsWith(r.path))
    if (route) void route.handler(req, res)
    else { res.writeHead(404); res.end() }
  })
  beforeAll(async () => { await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve)); base='http://127.0.0.1:'+(server.address() as any).port })
  afterAll(async () => { await new Promise<void>(resolve => server.close(()=>resolve())) })
  it('loads the four shipped assets without reading custom user pets', () => {
    expect(registry.entries.map(p=>p.id)).toEqual(expect.arrayContaining(['blue-throated-bee-eater','ouo-neko','whale-girl','whale-girl-refined']))
    expect(registry.defaultEntry().id).toBe('whale-girl')
  })
  it('single-character deployment keeps only the refined whale and still serves decorations', () => {
    const single = loadPetRegistry({ packageRoot: petPackageRoot(import.meta.url), singlePet: true, petsDir: '', dshPetsDir: '' })
    expect(single.entries.map(p=>p.id)).toEqual(['whale-girl-refined'])
    expect(single.defaultEntry().id).toBe('whale-girl-refined')
    expect(single.decorations?.length).toBeGreaterThan(0)
  })
  it('persists FPS, Tick and desktop settings through the real route', async () => {
    const patch={animationFps:24,animationMode:'tick',animationTickSlope:0.1,animationTickIntercept:4,desktopEnabled:true,bubbleScale:1.2}
    const r=await fetch(base+'/api/pet/set-config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(patch)})
    expect(r.status).toBe(200)
    expect((await r.json() as any).display).toMatchObject(patch)
    expect(JSON.parse(readFileSync(join(dir,'pet.json'),'utf8')).display).toMatchObject(patch)
  })
  it('rejects malformed JSON, non-JSON writes and invalid numeric settings', async () => {
    for(const [body,contentType,status] of [['{','application/json',400],['[]','application/json',400],['{}','text/plain',415],['{"animationFps":"60"}','application/json',400],['{"animationMode":"fast"}','application/json',400],['{"animationFps":1e400}','application/json',400]] as const) {
      const r=await fetch(base+'/api/pet/set-config',{method:'POST',headers:{'content-type':contentType},body})
      expect(r.status,body).toBe(status)
    }
    expect((await service.state()).display.animationFps).toBe(24)
  })
  it('blocks cross-origin writes while still accepting trusted desktop requests', async () => {
    const r=await fetch(base+'/api/pet/set-config',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.example'},body:'{"size":900}'})
    expect(r.status).toBe(403)
    expect((await service.state()).display.size).not.toBe(900)
  })
  it('rejects invalid linear parameters without changing saved settings', async () => {
    const before = service.display()
    for (const patch of [{ animationTickSlope: 0 }, { animationTickSlope: -1 }, { animationTickSlope: '0.2' },
      { animationTickSlope: 61 }, { animationTickIntercept: -61 }, { animationTickIntercept: 61 }, { animationTickIntercept: null }]) {
      const r = await fetch(base + '/api/pet/set-config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) })
      expect(r.status).toBe(400)
      expect(service.display()).toEqual(before)
    }
  })
  it('serves pet media with no-sniff, blocks path escapes, and never serves host files', async () => {
    const r=await fetch(base+'/pet/whale-girl/spritesheet.webp')
    expect(r.status).toBe(200);expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    const status=await new Promise<number>((resolve,reject)=>{
      httpRequest(base+'/pet/whale-girl/%2e%2e%2f%2e%2e%2fpet.json',r=>{r.resume();resolve(r.statusCode!)}).on('error',reject).end()
    })
    expect([403,404]).toContain(status)
  })
  it('takes Tick readings from the same sessionStats projection as the selected session footer', async () => {
    const selected={id:'selected'};const background={id:'background'}
    ctx.provide('sessions',{get:(id:string)=>id==='selected'?selected:background})
    ctx.provide('sessionProjections',{stateOf:(session:unknown,key:string)=>{
      expect(key).toBe('sessionStats')
      return session===selected?{decodeTokens:2640,decodeMs:10000}:{decodeTokens:100,decodeMs:10000}
    }})
    expect((await service.state('selected')).performance).toEqual({source:'sessionStats',tokensPerSecond:264,sessionId:'selected'})
    expect((await service.state('background')).performance?.tokensPerSecond).toBe(10)
  })
  it('distinguishes thinking, file writes and commands through real session events', async () => {
    await service.setPetId('whale-girl-refined')
    const session = { id: 'mapping', header: {} } as any
    const event = (type: string, data: any) => ctx.emit('session/event', session, { type, data } as any)
    let attempt = 0
    const stream = (type: string) => {
      ctx.emit('agent/assistant-stream', { agent: { session }, frame: { type: 'start', attemptId: 'mapping-' + ++attempt, revision: 1 } } as any)
      ctx.emit('agent/assistant-stream', { agent: { session }, frame: { type: 'chunk', attemptId: 'mapping-' + attempt, revision: 2, chunk: { type, text: 'x' } } } as any)
    }
    stream('reasoning-delta')
    expect((await service.state()).animation).toBe('running-right')
    ctx.emit('agent/assistant-stream', { agent: { session }, frame: { type: 'end', attemptId: 'mapping-1', revision: 3 } } as any)
    event('tool/call', { callId: 'cmd', name: 'exec_command', arguments: '{"command":"echo test"}' })
    expect((await service.state()).animation).toBe('running')
    event('tool/call', { callId: 'write', name: 'write_file', arguments: '{"path":"sample.txt"}' })
    expect((await service.state()).animation).toBe('running-left')
    expect((await service.state()).generation).toBeUndefined()
    event('tool/result', { message: { toolCallId: 'write' } })
    expect((await service.state()).animation).toBe('running')
    event('tool/result', { message: { toolCallId: 'cmd' } })
    expect((await service.state()).animation).toBe('review')
    stream('text-delta')
    expect((await service.state()).animation).toBe('running-right')
    event('turn/end', { reason: { kind: 'aborted' }, turn: 1 })
    expect((await service.state()).animation).toBe('idle')
    expect(registry.byId('whale-girl-refined')!.sequences?.idle).toEqual(['idle', 'running', 'idle', 'running', 'idle'])
  })
  it('keeps other characters mappings and restores their own speeds after switching and restarting', async () => {
    await service.setPetId('whale-girl')
    await service.setConfig({ animationMode: 'fixed', animationFps: 8, animationTickSlope: 0.1, animationTickIntercept: 4 })
    await service.setPetId('whale-girl-refined')
    await service.setConfig({ animationMode: 'tick', animationFps: 24, animationTickSlope: 0.2, animationTickIntercept: -5 })
    await service.setPetId('whale-girl')
    expect(service.display()).toMatchObject({ animationMode: 'fixed', animationFps: 8, animationTickSlope: 0.1, animationTickIntercept: 4 })
    const session = { id: 'other-pet', header: {} } as any
    ctx.emit('agent/assistant-stream', { agent: { session }, frame: { type: 'chunk', chunk: { type: 'reasoning-delta', text: 'x' } } } as any)
    expect((await service.state()).animation).toBe('running')
    ctx.emit('agent/assistant-stream', { agent: { session }, frame: { type: 'chunk', chunk: { type: 'finish', reason: { kind: 'stop' } } } } as any)
    ctx.emit('session/event', session, { type: 'tool/call', data: { callId: 'other', name: 'powershell', arguments: '{}' } } as any)
    expect((await service.state()).animation).toBe('running-right')
    await service.setPetId('whale-girl-refined')
    expect(service.display()).toMatchObject({ animationMode: 'tick', animationFps: 24, animationTickSlope: 0.2, animationTickIntercept: -5 })
    const reloaded = new PetService(new Context(), { registry, persistDir: dir })
    expect(reloaded.display()).toMatchObject({ animationMode: 'tick', animationFps: 24, animationTickSlope: 0.2, animationTickIntercept: -5 })
    await reloaded.setPetId('whale-girl')
    expect(reloaded.display()).toMatchObject({ animationMode: 'fixed', animationFps: 8, animationTickSlope: 0.1, animationTickIntercept: 4 })
  })
  it('rejects a settings form saved after switching to another character', async () => {
    await service.setPetId('whale-girl-refined')
    const before = service.display()
    const r = await fetch(base + '/api/pet/set-config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ petId: 'whale-girl', animationFps: 60 }) })
    expect(r.status).toBe(400)
    expect(service.display()).toEqual(before)
  })
})
