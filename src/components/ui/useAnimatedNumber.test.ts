import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnimatedNumber } from './useAnimatedNumber'

describe('useAnimatedNumber', () => {
  const rafCallbacks: Array<(time: number) => void> = []
  let frameId = 0

  beforeEach(() => {
    rafCallbacks.length = 0
    frameId = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb)
      return ++frameId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    vi.spyOn(performance, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useAnimatedNumber(1000))
    expect(result.current).toBe(1000)
  })

  it('returns target immediately when duration is 0', async () => {
    const { result, rerender } = renderHook(
      ({ target, duration }) => useAnimatedNumber(target, duration),
      { initialProps: { target: 100, duration: 0 } }
    )
    expect(result.current).toBe(100)

    rerender({ target: 200, duration: 0 })
    // Flush the Promise.resolve().then() microtask
    await act(async () => {})
    expect(result.current).toBe(200)
  })

  it('animates from old value to new value', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target, 500),
      { initialProps: { target: 0 } }
    )
    expect(result.current).toBe(0)

    rerender({ target: 1000 })

    // Simulate halfway through animation
    vi.spyOn(performance, 'now').mockReturnValue(250)
    act(() => {
      rafCallbacks.shift()!(250)
    })

    // Should be partway between 0 and 1000 (ease-out cubic at t=0.5 ≈ 0.875)
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(1000)
  })

  it('reaches target value at end of animation', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target, 500),
      { initialProps: { target: 0 } }
    )

    rerender({ target: 500 })

    // Simulate end of animation
    vi.spyOn(performance, 'now').mockReturnValue(500)
    act(() => {
      rafCallbacks.shift()!(500)
    })

    expect(result.current).toBe(500)
  })

  it('animates downward when value decreases', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target, 500),
      { initialProps: { target: 1000 } }
    )
    expect(result.current).toBe(1000)

    rerender({ target: 200 })

    // At end of animation
    vi.spyOn(performance, 'now').mockReturnValue(500)
    act(() => {
      rafCallbacks.shift()!(500)
    })

    expect(result.current).toBe(200)
  })

  it('does not animate when value stays the same', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target, 500),
      { initialProps: { target: 100 } }
    )
    expect(result.current).toBe(100)

    rerender({ target: 100 })
    expect(result.current).toBe(100)
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('cancels previous animation when value changes mid-animation', () => {
    const { rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target, 500),
      { initialProps: { target: 0 } }
    )

    rerender({ target: 1000 })
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)

    // Change target mid-animation
    rerender({ target: 500 })
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })
})
