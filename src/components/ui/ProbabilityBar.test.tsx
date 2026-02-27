import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProbabilityBar } from './ProbabilityBar'

describe('ProbabilityBar', () => {
  it('shows 50/50 when pool is empty', () => {
    render(<ProbabilityBar yesPool={0} totalPool={0} />)
    expect(screen.getByText('YES 50%')).toBeInTheDocument()
    expect(screen.getByText('NO 50%')).toBeInTheDocument()
  })

  it('calculates correct percentages', () => {
    render(<ProbabilityBar yesPool={75} totalPool={100} />)
    expect(screen.getByText('YES 75%')).toBeInTheDocument()
    expect(screen.getByText('NO 25%')).toBeInTheDocument()
  })

  it('shows 100/0 when all bets are YES', () => {
    render(<ProbabilityBar yesPool={200} totalPool={200} />)
    expect(screen.getByText('YES 100%')).toBeInTheDocument()
    expect(screen.getByText('NO 0%')).toBeInTheDocument()
  })

  it('renders the probability fill bar', () => {
    const { container } = render(<ProbabilityBar yesPool={60} totalPool={100} />)
    const fillBar = container.querySelector('.probability-fill')
    expect(fillBar).toBeInTheDocument()
    expect(fillBar).toHaveStyle({ width: '60%' })
  })
})
