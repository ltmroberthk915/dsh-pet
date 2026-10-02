// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PlaybackSettings } from './PlaybackSettings.tsx'
import type { DesktopStatus } from '../desktop-status.ts'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

function mockHost(desktop?: DesktopStatus) {
  let snapshot = { pet: { id: 'whale-girl-refined', displayName: '鲸鱼娘' },
    desktop,
    display: { animationMode: 'tick', animationFps: 20, animationTickSlope: 0.1, animationTickIntercept: 4, desktopEnabled: true },
    performance: { tokensPerSecond: 264 } }
  const writes: unknown[] = []
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (!init?.body) return { ok: true, json: async () => snapshot }
    const patch = JSON.parse(String(init.body))
    writes.push(patch)
    snapshot = { ...snapshot, display: { ...snapshot.display, ...patch } }
    return { ok: true, json: async () => ({ ok: true, display: snapshot.display }) }
  }))
  return { writes, switchPet: () => { snapshot = { ...snapshot, pet: { id: 'whale-girl', displayName: '另一形象' },
    display: { ...snapshot.display, animationTickSlope: 0.3, animationTickIntercept: 2 } } } }
}

describe('Tick settings', () => {
  it('shows the automatically started window version without asking for a patch', async () => {
    mockHost({ supported: true, state: 'ready', active: true, version: '1.2.0' })
    render(<PlaybackSettings />)
    expect(await screen.findByText('独立窗口已运行 · 1.2.0')).toBeTruthy()
    expect(screen.queryByText(/安装与回滚说明/)).toBeNull()
    expect(screen.getByText('宠物窗口归位')).toBeTruthy()
  })
  it('offers retry for a failed automatic startup', async () => {
    mockHost({ supported: true, state: 'error', active: false, version: '1.2.0', message: '磁盘空间不足' })
    render(<PlaybackSettings />)
    fireEvent.click(await screen.findByText('重试独立窗口'))
    await screen.findByText('正在重新准备独立窗口…')
    expect(fetch).toHaveBeenCalledWith('/api/pet/desktop/retry', expect.objectContaining({ method: 'POST', body: '{}' }))
  })
  it('saves the multi-pet switch together with the existing linear settings', async () => {
    const host = mockHost()
    render(<PlaybackSettings />)
    const checkbox = await screen.findByLabelText('多宠物模式') as HTMLInputElement
    expect(checkbox.checked).toBe(false)
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(true)
    fireEvent.click(screen.getByText('保存动画设置'))
    await screen.findByText('已保存')
    expect(host.writes).toEqual([expect.objectContaining({ multiPetEnabled: true, animationTickSlope: 0.1, animationTickIntercept: 4 })])
  })
  it('previews and saves both parameters against the actual footer rate', async () => {
    const host = mockHost()
    render(<PlaybackSettings />)
    expect(await screen.findByText('预览：264 tok/s → 30.4 FPS')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('斜率 k'), { target: { value: '0.2' } })
    fireEvent.change(screen.getByLabelText('截距 b'), { target: { value: '5' } })
    expect(screen.getByText('预览：264 tok/s → 57.8 FPS')).toBeTruthy()
    fireEvent.click(screen.getByText('保存动画设置'))
    await screen.findByText('已保存')
    expect(host.writes).toEqual([{ petId: 'whale-girl-refined', animationMode: 'tick', animationFps: 20,
      desktopEnabled: true, multiPetEnabled: false, animationTickSlope: 0.2, animationTickIntercept: 5 }])
  })

  it('blocks a nonpositive slope and displays output limits in the preview', async () => {
    const host = mockHost()
    render(<PlaybackSettings />)
    await screen.findByLabelText('斜率 k')
    fireEvent.change(screen.getByLabelText('斜率 k'), { target: { value: '0' } })
    expect((screen.getByText('保存动画设置') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByText('保存动画设置'))
    expect(host.writes).toEqual([])
    fireEvent.change(screen.getByLabelText('斜率 k'), { target: { value: '1' } })
    expect(screen.getByText('预览：264 tok/s → 60.0 FPS')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('动画 FPS'), { target: { value: '100' } })
    expect(screen.getByText('帧率需为 1–60 之间的数字；当前输入尚未提交保存。')).toBeTruthy()
    expect((screen.getByText('保存动画设置') as HTMLButtonElement).disabled).toBe(true)
  })

  it('keeps a draft during polling and loads separate values on a character change', async () => {
    const host = mockHost()
    vi.useFakeTimers()
    render(<PlaybackSettings />)
    await act(async () => { await Promise.resolve() })
    fireEvent.change(screen.getByLabelText('斜率 k'), { target: { value: '0.25' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect((screen.getByLabelText('斜率 k') as HTMLInputElement).value).toBe('0.25')
    host.switchPet()
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect((screen.getByLabelText('斜率 k') as HTMLInputElement).value).toBe('0.3')
    expect((screen.getByLabelText('截距 b') as HTMLInputElement).value).toBe('2')
  })
})
