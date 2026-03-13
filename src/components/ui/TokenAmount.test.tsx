import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { TokenAmount } from './TokenAmount'

describe('TokenAmount', () => {
  it('renders the amount', () => {
    render(<TokenAmount amount={1500} />)
    expect(screen.getByText('1,500')).toBeInTheDocument()
  })

  it('applies mono font and amber color', () => {
    render(<TokenAmount amount={100} />)
    const el = screen.getByText('100')
    expect(el.className).toContain('font-mono')
    expect(el.className).toContain('text-accent-amber')
  })

  it('applies custom className', () => {
    render(<TokenAmount amount={0} className="text-sm" />)
    expect(screen.getByText('0').className).toContain('text-sm')
  })

  it('renders zero', () => {
    render(<TokenAmount amount={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  describe('with animate prop', () => {
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

    it('renders initial amount immediately when animate is true', () => {
      render(<TokenAmount amount={500} animate />)
      expect(screen.getByText('500')).toBeInTheDocument()
    })

    it('animates to new value when amount changes', () => {
      const { rerender } = render(<TokenAmount amount={0} animate />)
      expect(screen.getByText('0')).toBeInTheDocument()

      rerender(<TokenAmount amount={1000} animate />)

      // Complete the animation
      vi.spyOn(performance, 'now').mockReturnValue(500)
      act(() => {
        rafCallbacks.shift()!(500)
      })

      expect(screen.getByText('1,000')).toBeInTheDocument()
    })
  })
})
