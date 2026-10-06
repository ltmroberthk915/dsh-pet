import { useEffect, useState } from 'react'
import { animationFps, animationMode, optionalFps, tickSlope, tickIntercept, effectiveFps, DEFAULT_TICK_SLOPE, DEFAULT_TICK_INTERCEPT, MIN_TICK_SLOPE, MAX_TICK_SLOPE, MIN_TICK_INTERCEPT, MAX_TICK_INTERCEPT, type AnimationMode } from '../animation.ts'
import type { PetStateView } from '../service.ts'
import { desktopConnection, desktopRequest } from './desktop-connection.ts'
import { petJson, petServiceFailure, type PetServiceStatus } from './pet-api.ts'
import { t } from './locales.ts'

async function request(action: string, body?: unknown): Promise<any> {
  return petJson('/api/pet/' + (action === 'config' ? 'set-config' : 'state'), body === undefined ? {} : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

/** Also works in aggregate profiles that do not expose a Host settings form. */
export function PlaybackSettings() {
  const [snapshot, setSnapshot] = useState<PetStateView | null>(null)
  const [mode, setMode] = useState<AnimationMode>('fixed')
  const [fps, setFps] = useState('12')
  const [limitRunning, setLimitRunning] = useState(false)
  const [runLimit, setRunLimit] = useState('60')
  const [customActions, setCustomActions] = useState(false)
  const [actionFps, setActionFps] = useState('12')
  const [slope, setSlope] = useState(String(DEFAULT_TICK_SLOPE))
  const [intercept, setIntercept] = useState(String(DEFAULT_TICK_INTERCEPT))
  const [desktop, setDesktop] = useState(true)
  const [multi, setMulti] = useState(false)
  const [bubbleOnly, setBubbleOnly] = useState(false)
  const [hoverPanel, setHoverPanel] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [serviceStatus, setServiceStatus] = useState<PetServiceStatus>('loading')
  useEffect(() => {
    let alive = true
    let timer: number | undefined
    let selected: string | undefined
    const refresh = () => request('state').then((state: PetStateView) => {
      if (!alive) return
      if (typeof state.pet?.id !== 'string' || !state.display) throw new Error('Invalid pet service state')
      setSnapshot(state)
      setServiceStatus('ready')
      if (selected !== state.pet.id) {
        selected = state.pet.id
        setMode(animationMode(state.display.animationMode)); setFps(String(animationFps(state.display.animationFps)))
        const limit = optionalFps(state.display.animationRunFpsLimit), actions = optionalFps(state.display.animationActionFps)
        setLimitRunning(limit > 0); setRunLimit(String(limit || 60))
        setCustomActions(actions > 0); setActionFps(String(actions || 12))
        setSlope(String(tickSlope(state.display.animationTickSlope)))
        setIntercept(String(tickIntercept(state.display.animationTickIntercept)))
        setDesktop(state.display.desktopEnabled !== false)
        setMulti(state.display.multiPetEnabled === true)
        setBubbleOnly(state.display.bubbleOnly === true)
        setHoverPanel(state.display.hoverPanelEnabled === true)
      }
    }).catch((error) => {
      if (alive) { setServiceStatus(petServiceFailure(error)); setMessage('') }
    }).finally(() => {
      if (alive) timer = window.setTimeout(() => void refresh(), 2000)
    })
    void refresh()
    return () => { alive = false; window.clearTimeout(timer) }
  }, [])
  const connected = serviceStatus === 'ready' && snapshot !== null
  const validLinear = slope.trim() !== '' && Number.isFinite(Number(slope)) && Number(slope) >= MIN_TICK_SLOPE && Number(slope) <= MAX_TICK_SLOPE
    && intercept.trim() !== '' && Number.isFinite(Number(intercept)) && Number(intercept) >= MIN_TICK_INTERCEPT && Number(intercept) <= MAX_TICK_INTERCEPT
  const positiveFps = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 1
  const validFps = positiveFps(fps)
  const validLimit = !limitRunning || positiveFps(runLimit)
  const validActions = !customActions || positiveFps(actionFps)
  const savedLimit = limitRunning ? Number(runLimit) : 0
  const savedActions = customActions ? Number(actionFps) : 0
  const valid = validFps && validLimit && validActions && (mode !== 'tick' || validLinear)
  async function save() {
    if (!valid || busy || !connected) return
    setBusy(true); setMessage('')
    try {
      const linear = validLinear ? { animationTickSlope: Number(slope), animationTickIntercept: Number(intercept) } : {}
      const result = await request('config', { petId: snapshot?.pet.id, animationMode: mode, animationFps: Number(fps), animationRunFpsLimit: savedLimit, animationActionFps: savedActions, desktopEnabled: desktop, multiPetEnabled: multi, bubbleOnly, hoverPanelEnabled: hoverPanel, ...linear })
      if (result.ok !== true || result.display?.animationMode !== mode || result.display?.animationFps !== Number(fps)
        || result.display?.desktopEnabled !== desktop || result.display?.multiPetEnabled !== multi || result.display?.bubbleOnly !== bubbleOnly || result.display?.hoverPanelEnabled !== hoverPanel
        || result.display?.animationRunFpsLimit !== savedLimit || result.display?.animationActionFps !== savedActions
        || (validLinear && (result.display?.animationTickSlope !== Number(slope) || result.display?.animationTickIntercept !== Number(intercept)))) throw new Error('设置未保存')
      setSlope(String(tickSlope(result.display.animationTickSlope)))
      setIntercept(String(tickIntercept(result.display.animationTickIntercept)))
      setMessage('已保存')
    } catch { setMessage('保存失败，设置保留，请重试。') }
    finally { setBusy(false) }
  }
  async function resetPosition() {
    const bridge = desktopConnection(snapshot?.desktop)
    if (!bridge || busy || !connected) return
    setBusy(true)
    try {
      const result = await bridge.resetPosition()
      setMessage(result.active ? '宠物窗口已归位' : '请先保存并启用独立桌面宠物。')
    } catch { setMessage('归位失败，请重试。') }
    finally { setBusy(false) }
  }
  const rate = snapshot?.performance?.tokensPerSecond
  const desktopStatus = snapshot?.desktop
  async function retryDesktop() {
    if (busy || !connected) return
    setBusy(true)
    try {
      await desktopRequest('retry')
      setMessage('正在重新准备独立窗口…')
    } catch { setMessage('重试失败，请稍后再试。') }
    finally { setBusy(false) }
  }
  return <section data-pet-controls style={{ padding: 16, border: '1px solid #7775', borderRadius: 12, display: 'grid', gap: 10, color: 'inherit', fontSize: 13 }}>
    <strong>{snapshot?.pet.displayName ?? '当前形象'} · 生成速度动画</strong>
    {serviceStatus !== 'ready' && <p role="status">{t(serviceStatus === 'authorization' ? 'settings.serviceAuthorization'
      : serviceStatus === 'loading' ? 'settings.serviceLoading' : 'settings.serviceUnavailable')}</p>}
    <fieldset disabled={!connected || busy} style={{ display: 'grid', gap: 10, border: 0, padding: 0, margin: 0, minWidth: 0 }}>
    <label><input aria-label="仅显示状态气泡（无宠物图）" type="checkbox" checked={bubbleOnly} onChange={e => setBubbleOnly(e.target.checked)} /> 仅显示状态气泡（无宠物图）</label>
    <div style={{ opacity: .8 }}>隐藏形象，仅保留可拖动的任务状态气泡；空闲时常驻「随时就绪」。左键唤出 DSH，右键抚摸并展开看板。</div>
    <label><input aria-label="悬停展开看板" type="checkbox" checked={hoverPanel} onChange={e => setHoverPanel(e.target.checked)} /> 悬停展开看板</label>
    <div style={{ opacity: .8 }}>默认关闭，鼠标经过时不展开补充能量、命名和隐藏面板。右键抚摸并打开看板；开启后也可悬停展开。</div>
    <label>左右跑动模式 <select aria-label="播放模式" value={mode} onChange={e => setMode(e.target.value as AnimationMode)}>
      <option value="fixed">固定 FPS</option><option value="native">素材原速</option><option value="tick">Tick · 跟随底部 tok/s</option>
    </select></label>
    <label>{mode === 'tick' ? '无统计数据时的 FPS' : '左右跑动 FPS'} <input aria-label="动画 FPS" type="number" min="1" step="any" value={fps} disabled={mode === 'native'} onChange={e => setFps(e.target.value)} style={{ width: 88 }} /></label>
    {!validFps && <div role="alert">帧率需为不小于 1 的有效数字；当前输入尚未提交保存。</div>}
    <div style={{ opacity: .8, lineHeight: 1.6 }}>思考、回答及其他工具参数生成向右跑；写文件、编辑和补丁内容生成向左跑。左右跑动默认不设上限，所有形象使用同一规则。</div>
    <label><input aria-label="限制左右跑动帧率" type="checkbox" checked={limitRunning} onChange={e => setLimitRunning(e.target.checked)} /> 限制左右跑动帧率</label>
    {limitRunning && <label>左右跑动最高 FPS <input aria-label="左右跑动最高 FPS" type="number" min="1" step="any" value={runLimit} onChange={e => setRunLimit(e.target.value)} style={{ width: 88 }} /></label>}
    {!validLimit && <div role="alert">左右跑动上限需为不小于 1 的有效数字。</div>}
    {snapshot?.pet.id === 'blue-whale-business' && <div style={{ opacity: .8 }}>商务小蓝鲸的形象和占位底板统一为设定大小的 75%，主宠物与后台小宠物均生效。</div>}
    {mode === 'tick' && <>
      <div>FPS = k × 底部 tok/s + b；{limitRunning ? `上限由你设为 ${runLimit} FPS。` : '未设置上限。'}</div>
      <label>斜率 k <input aria-label="斜率 k" type="number" min={MIN_TICK_SLOPE} max={MAX_TICK_SLOPE} step="any" value={slope} onChange={e => setSlope(e.target.value)} style={{ width: 180 }} /></label>
      <label>截距 b（FPS） <input aria-label="截距 b" type="number" min={MIN_TICK_INTERCEPT} max={MAX_TICK_INTERCEPT} step="any" value={intercept} onChange={e => setIntercept(e.target.value)} style={{ width: 96 }} /></label>
      <div style={{ opacity: .8, lineHeight: 1.6 }}>k 控制速度每增加 1 tok/s 时增加多少 FPS；b 控制起始帧率。跟随当前会话底栏统计，步骤完成后更新。</div>
      {!validLinear && <div role="alert">k 需在 {MIN_TICK_SLOPE}–{MAX_TICK_SLOPE} 之间，b 需在 {MIN_TICK_INTERCEPT}–{MAX_TICK_INTERCEPT} 之间。</div>}
      {validLinear && validLimit && validFps && <div>{rate === undefined ? `底栏暂无速度，使用备用 ${effectiveFps({ animationFps: Number(fps), animationRunFpsLimit: savedLimit })} FPS` : `预览：${rate} tok/s → ${effectiveFps({ animationMode: 'tick', animationTickSlope: Number(slope), animationTickIntercept: Number(intercept), animationRunFpsLimit: savedLimit }, rate)?.toFixed(1)} FPS`}</div>}
    </>}
    <label><input aria-label="自设其他动作速率" type="checkbox" checked={customActions} onChange={e => setCustomActions(e.target.checked)} /> 自设其他动作速率</label>
    {customActions && <label>其他动作 FPS <input aria-label="其他动作 FPS" type="number" min="1" step="any" value={actionFps} onChange={e => setActionFps(e.target.value)} style={{ width: 88 }} /></label>}
    <div style={{ opacity: .8 }}>用于待机、挥手、喂食等非左右跑动动作，与 tok/s 无关。可以自行填写 FPS，不设 12 或 60 FPS 上限；关闭时保留素材原速。</div>
    {!validActions && <div role="alert">其他动作帧率需为不小于 1 的有效数字。</div>}
    <label><input aria-label="多宠物模式" type="checkbox" checked={multi} onChange={e => setMulti(e.target.checked)} /> 多宠物模式</label>
    <div style={{ opacity: .8, lineHeight: 1.6 }}>{multi
      ? bubbleOnly ? '活跃对话各显示一个状态气泡，分别跟随所属任务。左键点气泡唤出 DSH 并查看对应对话；查看后切到其他对话时回收。' : '活跃对话各一只，分别跟随自己的 tok/s；主对话保持原大小，其余为 52.7% 且不弹气泡。新建、尺寸切换或拖动结束时自动避让。后台对话结束后，小宠物保留等待查看；点开对话或单击小宠物即可查看并变为主宠物，不需要输入文字。查看后切到其他对话时回收。'
      : '仅一只默认 DS 蓝色宠物，动作、气泡和 tok/s 随主窗口当前对话切换。'}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{[['#c7edcc','GPT · 豆沙绿'],['#d97941','Claude · 橙'],['#24262d','Kimi · 黑'],['#570763','GLM · 暗清华紫'],['#6c9cda','DS · 原色']].map(([color,label]) => <span key={label}><i style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: color, border: '1px solid #888', marginRight: 4 }} />{label}</span>)}</div>
    <div style={{ opacity: .8 }}>优先使用模型对应色；已占用时先分配空闲色，第六只起随机分配并尽量拉开色差。关闭多宠物模式不会清除已分配颜色。</div>
    <div style={{ opacity: .8, lineHeight: 1.6 }}>所有宠物共享累计：喂食次数、亲密度和小鱼干统一记录。各对话的完成奖励汇入同一份记录，切换对话、开关多宠物或重启都不会拆分或重置。</div>
    <label><input type="checkbox" checked={desktop} onChange={e => setDesktop(e.target.checked)} /> 独立桌面宠物</label>
    <div style={{ opacity: .8 }}>主窗口隐藏或最小化后继续显示；退出 DSH 后关闭。</div>
    {desktopStatus?.supported && <div data-pet-desktop-status={desktopStatus.state}>
      {desktopStatus.state === 'starting' ? '正在首次准备独立窗口，请稍候…'
        : desktopStatus.state === 'error' ? desktopStatus.message ?? '独立窗口暂不可用，请重试。'
        : desktopStatus.active ? `独立窗口已运行 · ${desktopStatus.version}` : '独立窗口已随插件集成，保存并启用后自动显示。'}
      {desktopStatus.state === 'error' && <button type="button" disabled={busy} onClick={() => void retryDesktop()}>重试独立窗口</button>}
    </div>}
    {(desktopStatus?.supported || window.dshPetDesktop) && <div><button type="button" onClick={() => void resetPosition()} disabled={busy}>宠物窗口归位</button></div>}
    {desktopStatus && !desktopStatus.supported && !window.dshPetDesktop && <div>独立窗口支持 Windows 原生 DSH；当前环境使用应用内宠物。</div>}
    <div><button type="button" onClick={() => void save()} disabled={busy || !valid || !connected}>{busy ? '保存中…' : '保存动画设置'}</button> <span role="status">{message}</span></div>
    </fieldset>
  </section>
}
