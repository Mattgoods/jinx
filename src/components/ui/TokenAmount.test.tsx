import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TokenAmount } from './TokenAmount'

describe('TokenAmount', () => {
  it('renders the amount', () => {
    render(<TokenAmount amount={1500} />)
    expect(screen.getByText('1500')).toBeInTheDocument()
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
})
