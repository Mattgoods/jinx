import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies base styles', () => {
    render(<Card><span data-testid="child">Test</span></Card>)
    const card = screen.getByTestId('child').parentElement!
    expect(card.className).toContain('rounded-xl')
    expect(card.className).toContain('border-border')
    expect(card.className).toContain('bg-bg-surface')
  })

  it('applies card-enter animation when animate is true', () => {
    render(<Card animate><span data-testid="child">Animated</span></Card>)
    const card = screen.getByTestId('child').parentElement!
    expect(card.className).toContain('card-enter')
  })

  it('does not apply animation by default', () => {
    render(<Card><span data-testid="child">Static</span></Card>)
    const card = screen.getByTestId('child').parentElement!
    expect(card.className).not.toContain('card-enter')
  })

  it('applies padding sizes', () => {
    const { rerender } = render(<Card padding="sm"><span data-testid="child">Small</span></Card>)
    expect(screen.getByTestId('child').parentElement!.className).toContain('p-4')

    rerender(<Card padding="lg"><span data-testid="child">Large</span></Card>)
    expect(screen.getByTestId('child').parentElement!.className).toContain('p-6')
  })

  it('merges custom className', () => {
    render(<Card className="custom-class"><span data-testid="child">Test</span></Card>)
    expect(screen.getByTestId('child').parentElement!.className).toContain('custom-class')
  })
})
