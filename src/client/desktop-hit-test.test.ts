// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installDesktopHitTesting } from './desktop-hit-test.ts'
import './desktop-bridge.d.ts'

let dispose: (() => void) | undefined
beforeEach(() => { vi.useFakeTimers(); document.body.replaceChildren() })
afterEach(() => { dispose?.(); dispose = undefined; vi.restoreAllMocks(); vi.useRealTimers() })
function target(x = 100, y = 80, width = 60, height = 70) {
  const button = document.createElement('button')
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(new DOMRect(x, y, width, height))
  document.body.append(button)
  return button
}
function setup() {
  const interactive = vi.fn()
  dispose = installDesktopHitTesting({ interactive })
  vi.advanceTimersByTime(20)
  return interactive
}
describe('desktop pet hit regions', () => {
  it('keeps geometry available across false mouseleave and blur events', () => {
    target()
    const send = setup()
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 120, clientY: 90 }))
    expect(send).toHaveBeenLastCalledWith(true, [[100, 80, 60, 70]])
    document.dispatchEvent(new MouseEvent('mouseleave'))
    window.dispatchEvent(new Event('blur'))
    expect(send).toHaveBeenLastCalledWith(false, [[100, 80, 60, 70]])
    const calls = send.mock.calls.length
    document.dispatchEvent(new MouseEvent('mouseleave'))
    expect(send).toHaveBeenCalledTimes(calls + 1)
  })
  it('uses coordinates even when a forwarded mouse event targets the document', () => {
    target()
    const send = setup()
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 120, clientY: 90 }))
    expect(send.mock.lastCall?.[0]).toBe(true)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20 }))
    expect(send.mock.lastCall?.[0]).toBe(false)
  })
  it('includes newly opened controls and drops removed controls', async () => {
    const send = setup()
    const button = target()
    await Promise.resolve(); vi.advanceTimersByTime(20)
    expect(send.mock.lastCall?.[1]).toEqual([[100, 80, 60, 70]])
    button.remove()
    await Promise.resolve(); vi.advanceTimersByTime(20)
    expect(send.mock.lastCall?.[1]).toEqual([])
  })
  it('bounds regions to the viewport and excludes hidden controls', () => {
    target(-10, -10, 30, 30)
    const hidden = target(); hidden.style.visibility = 'hidden'
    expect(setup().mock.lastCall?.[1]).toEqual([[0, 0, 20, 20]])
  })
  it('does not wake on animation style changes or duplicate mouse positions', async () => {
    const button = target()
    const send = setup()
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 120, clientY: 90 }))
    const calls = send.mock.calls.length
    for (let i = 0; i < 12; i++) {
      button.style.backgroundPosition = `${i}px 0px`
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 121, clientY: 90 }))
    }
    await Promise.resolve(); vi.advanceTimersByTime(200)
    expect(send).toHaveBeenCalledTimes(calls)
    dispose?.()
    document.dispatchEvent(new MouseEvent('mouseleave'))
    expect(send).toHaveBeenCalledTimes(calls)
  })
})
