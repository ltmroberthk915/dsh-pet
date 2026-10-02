import { useEffect, useState } from 'react'
import { animationFps, animationMode, tickSlope, tickIntercept, effectiveFps, DEFAULT_TICK_SLOPE, DEFAULT_TICK_INTERCEPT, MIN_TICK_SLOPE, MAX_TICK_SLOPE, MIN_TICK_INTERCEPT, MAX_TICK_INTERCEPT, type AnimationMode } from '../animation.ts'
import type { PetStateView } from '../service.ts'

async function request(action: string, body?: unknown): Promise<any> {
  if (action === 'state' && window.dshPetDesktop?.state) return window.dshPetDesktop.state()
  const response = await fetch('/api/pet/' + (action === 'config' ? 'set-config' : 'state'), body === undefined ? {} : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  return response.json()
}

/** Also works in aggregate profiles that do not expose a Host settings form. */
export function PlaybackSettings() {
  const [snapshot, setSnapshot] = useState<PetStateView | null>(null)
  const [mode, setMode] = useState<AnimationMode>('fixed')
  const [fps, setFps] = useState('12')
  const [slope, setSlope] = useState(String(DEFAULT_TICK_SLOPE))
  const [intercept, setIntercept] = useState(String(DEFAULT_TICK_INTERCEPT))
  const [desktop, setDesktop] = useState(true)
  const [multi, setMulti] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    let selected: string | undefined
    const refresh = () => request('state').then((state: PetStateView) => {
      if (!alive) return
      setSnapshot(state)
      if (selected !== state.pet.id) {
        selected = state.pet.id
        setMode(animationMode(state.display.animationMode)); setFps(String(animationFps(state.display.animationFps)))
        setSlope(String(tickSlope(state.display.animationTickSlope)))
        setIntercept(String(tickIntercept(state.display.animationTickIntercept)))
        setDesktop(state.display.desktopEnabled !== false)
        setMulti(state.display.multiPetEnabled === true)
      }
    }).catch(() => { if (alive) setMessage('宠物服务暂不可用，请启用插件后重试。') })
    void refresh()
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])
  const validLinear = slope.trim() !== '' && Number.isFinite(Number(slope)) && Number(slope) >= MIN_TICK_SLOPE && Number(slope) <= MAX_TICK_SLOPE
    && intercept.trim() !== '' && Number.isFinite(Number(intercept)) && Number(intercept) >= MIN_TICK_INTERCEPT && Number(intercept) <= MAX_TICK_INTERCEPT
  const validFps = fps.trim() !== '' && Number.isFinite(Number(fps)) && Number(fps) >= 1 && Number(fps) <= 60
  const valid = validFps && (mode !== 'tick' || validLinear)
  async function save() {
    if (!valid || busy) return
    setBusy(true); setMessage('')
    try {
      const linear = validLinear ? { animationTickSlope: Number(slope), animationTickIntercept: Number(intercept) } : {}
      const result = await request('config', { petId: snapshot?.pet.id, animationMode: mode, animationFps: Number(fps), desktopEnabled: desktop, multiPetEnabled: multi, ...linear })
      if (result.ok !== true || result.display?.animationMode !== mode || result.display?.animationFps !== Number(fps)
        || result.display?.desktopEnabled !== desktop || result.display?.multiPetEnabled !== multi
        || (validLinear && (result.display?.animationTickSlope !== Number(slope) || result.display?.animationTickIntercept !== Number(intercept)))) throw new Error('设置未保存')
      setSlope(String(tickSlope(result.display.animationTickSlope)))
      setIntercept(String(tickIntercept(result.display.animationTickIntercept)))
      setMessage('已保存')
    } catch { setMessage('保存失败，设置保留，请重试。') }
    finally { setBusy(false) }
  }
  async function resetPosition() {
    if (!window.dshPetDesktop || busy) return
    setBusy(true)
    try {
      const result = await window.dshPetDesktop.resetPosition()
      setMessage(result.active ? '宠物窗口已归位' : '请先保存并启用独立桌面宠物。')
    } catch { setMessage('归位失败，请重试。') }
    finally { setBusy(false) }
  }
  const rate = snapshot?.performance?.tokensPerSecond
  return <section data-pet-controls style={{ padding: 16, border: '1px solid #7775', borderRadius: 12, display: 'grid', gap: 10, color: 'inherit', fontSize: 13 }}>
    <strong>{snapshot?.pet.displayName ?? '当前形象'} · 生成速度动画</strong>
    <label>播放模式 <select aria-label="播放模式" value={mode} onChange={e => setMode(e.target.value as AnimationMode)}>
      <option value="fixed">固定 FPS</option><option value="native">素材原速</option><option value="tick">Tick · 跟随底部 tok/s</option>
    </select></label>
    <label>{mode === 'tick' ? '无统计数据时的 FPS' : '动画 FPS'} <input aria-label="动画 FPS" type="number" min="1" max="60" step="1" value={fps} disabled={mode === 'native'} onChange={e => setFps(e.target.value)} style={{ width: 64 }} /></label>
    {!validFps && <div role="alert">帧率需为 1–60 之间的数字；当前输入尚未提交保存。</div>}
    <div style={{ opacity: .8, lineHeight: 1.6 }}>思考、回答及其他工具参数生成向右跑；写文件、编辑和补丁内容生成向左跑。所有左右跑步（含工具执行）共用此帧率设置，其他动作按各自节奏播放。固定帧率默认 12 FPS，支持 1–60。</div>
    {mode === 'tick' && <>
      <div>FPS = k × 底部 tok/s + b，结果限制在 1–60 FPS。</div>
      <label>斜率 k <input aria-label="斜率 k" type="number" min={MIN_TICK_SLOPE} max={MAX_TICK_SLOPE} step="any" value={slope} onChange={e => setSlope(e.target.value)} style={{ width: 180 }} /></label>
      <label>截距 b（FPS） <input aria-label="截距 b" type="number" min={MIN_TICK_INTERCEPT} max={MAX_TICK_INTERCEPT} step="any" value={intercept} onChange={e => setIntercept(e.target.value)} style={{ width: 96 }} /></label>
      <div style={{ opacity: .8, lineHeight: 1.6 }}>k 控制速度每增加 1 tok/s 时增加多少 FPS；b 控制起始帧率。跟随当前会话底栏统计，步骤完成后更新。</div>
      {!validLinear && <div role="alert">k 需在 {MIN_TICK_SLOPE}–{MAX_TICK_SLOPE} 之间，b 需在 {MIN_TICK_INTERCEPT}–{MAX_TICK_INTERCEPT} 之间。</div>}
      {validLinear && <div>{rate === undefined ? `底栏暂无速度，使用备用 ${fps} FPS` : `预览：${rate} tok/s → ${effectiveFps({ animationMode: 'tick', animationTickSlope: Number(slope), animationTickIntercept: Number(intercept) }, rate)?.toFixed(1)} FPS`}</div>}
    </>}
    <label><input aria-label="多宠物模式" type="checkbox" checked={multi} onChange={e => setMulti(e.target.checked)} /> 多宠物模式</label>
    <div style={{ opacity: .8, lineHeight: 1.6 }}>{multi
      ? '活跃对话各一只，分别跟随自己的 tok/s；主对话保持原大小，其余为 52.7% 且不弹气泡。新建、尺寸切换或拖动结束时自动避让。后台对话结束后，小宠物保留等待查看；点开对话或双击小宠物即可查看并变为主宠物，不需要输入文字。查看后切到其他对话时回收。'
      : '仅一只默认 DS 蓝色宠物，动作、气泡和 tok/s 随主窗口当前对话切换。'}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{[['#c7edcc','GPT · 豆沙绿'],['#d97941','Claude · 橙'],['#24262d','Kimi · 黑'],['#570763','GLM · 暗清华紫'],['#6c9cda','DS · 原色']].map(([color,label]) => <span key={label}><i style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: color, border: '1px solid #888', marginRight: 4 }} />{label}</span>)}</div>
    <div style={{ opacity: .8 }}>优先使用模型对应色；已占用时先分配空闲色，第六只起随机分配并尽量拉开色差。关闭多宠物模式不会清除已分配颜色。</div>
    <div style={{ opacity: .8, lineHeight: 1.6 }}>所有宠物共享累计：喂食次数、亲密度和小鱼干统一记录。各对话的完成奖励汇入同一份记录，切换对话、开关多宠物或重启都不会拆分或重置。</div>
    <label><input type="checkbox" checked={desktop} onChange={e => setDesktop(e.target.checked)} /> 独立桌面宠物</label>
    <div style={{ opacity: .8 }}>主窗口隐藏或最小化后继续显示；退出 DSH 后关闭。</div>
    {window.dshPetDesktop && <div><button type="button" onClick={() => void resetPosition()} disabled={busy}>宠物窗口归位</button></div>}
    {!window.dshPetDesktop && <div>当前宿主没有桌面窗口接口，宠物仍显示在应用内。</div>}
    <div><button type="button" onClick={() => void save()} disabled={busy || !valid || snapshot === null}>{busy ? '保存中…' : '保存动画设置'}</button> <span role="status">{message}</span></div>
  </section>
}
