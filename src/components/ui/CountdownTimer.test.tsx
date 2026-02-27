import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CountdownTimer } from './CountdownTimer'

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders remaining time in days/hours/minutes format', () => {
    const futureDate = new Date(Date.now() + 2 * 86400000 + 3 * 3600000 + 15 * 60000).toISOString()
    render(<CountdownTimer targetDate={futureDate} />)
    expect(screen.getByText('2d 3h 15m')).toBeInTheDocument()
  })

  it('renders hours/minutes/seconds when under a day', () => {
    const futureDate = new Date(Date.now() + 5 * 3600000 + 30 * 60000 + 10000).toISOString()
    render(<CountdownTimer targetDate={futureDate} />)
    expect(screen.getByText('5h 30m 10s')).toBeInTheDocument()
  })

  it('renders minutes/seconds when under an hour', () => {
    const futureDate = new Date(Date.now() + 45 * 60000 + 20000).toISOString()
    render(<CountdownTimer targetDate={futureDate} />)
    expect(screen.getByText('45m 20s')).toBeInTheDocument()
  })

  it('renders seconds only when under a minute', () => {
    const futureDate = new Date(Date.now() + 30000).toISOString()
    render(<CountdownTimer targetDate={futureDate} />)
    expect(screen.getByText('30s')).toBeInTheDocument()
  })

  it('shows expired text when countdown is over', () => {
    const pastDate = new Date(Date.now() - 10000).toISOString()
    render(<CountdownTimer targetDate={pastDate} />)
    expect(screen.getByText('Ended')).toBeInTheDocument()
  })

  it('shows custom expired text', () => {
    const pastDate = new Date(Date.now() - 10000).toISOString()
    render(<CountdownTimer targetDate={pastDate} expiredText="Window closed" />)
    expect(screen.getByText('Window closed')).toBeInTheDocument()
  })

  it('displays label prefix when provided', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString()
    render(<CountdownTimer targetDate={futureDate} label="Ends in" />)
    expect(screen.getByText('Ends in')).toBeInTheDocument()
  })

  it('applies mono font', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString()
    render(<CountdownTimer targetDate={futureDate} />)
    const el = screen.getByText(/\d+m/)
    expect(el.className).toContain('font-mono')
  })

  it('applies urgent class when below threshold', () => {
    const futureDate = new Date(Date.now() + 30 * 60000).toISOString() // 30 minutes
    render(<CountdownTimer targetDate={futureDate} />)
    const el = screen.getByText(/\d+m/)
    expect(el.className).toContain('countdown-urgent')
    expect(el.className).toContain('text-accent-red')
  })

  it('does not apply urgent class when above threshold', () => {
    const futureDate = new Date(Date.now() + 2 * 3600000).toISOString() // 2 hours
    render(<CountdownTimer targetDate={futureDate} />)
    const el = screen.getByText(/\d+h/)
    expect(el.className).not.toContain('countdown-urgent')
    expect(el.className).toContain('text-text-secondary')
  })

  it('applies custom className', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString()
    render(<CountdownTimer targetDate={futureDate} className="text-lg" />)
    const el = screen.getByText(/\d+m/)
    expect(el.className).toContain('text-lg')
  })

  it('supports custom urgent threshold', () => {
    const futureDate = new Date(Date.now() + 3 * 3600000).toISOString() // 3 hours
    render(<CountdownTimer targetDate={futureDate} urgentThresholdMs={4 * 3600000} />) // 4 hour threshold
    const el = screen.getByText(/\d+h/)
    expect(el.className).toContain('countdown-urgent')
  })

  it('transitions to expired text when time runs out', () => {
    const futureDate = new Date(Date.now() + 2000).toISOString() // 2 seconds
    render(<CountdownTimer targetDate={futureDate} />)
    expect(screen.getByText('2s')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('Ended')).toBeInTheDocument()
  })

  it('updates every second', () => {
    const futureDate = new Date(Date.now() + 10000).toISOString() // 10 seconds
    render(<CountdownTimer targetDate={futureDate} />)
    expect(screen.getByText('10s')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText('9s')).toBeInTheDocument()
  })
})
