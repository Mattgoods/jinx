import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the status label in uppercase with underscores replaced', () => {
    render(<StatusBadge status="pending_resolution" />)
    expect(screen.getByText('PENDING RESOLUTION')).toBeInTheDocument()
  })

  it('applies green variant for active status', () => {
    render(<StatusBadge status="active" />)
    const badge = screen.getByText('ACTIVE')
    expect(badge.className).toContain('text-accent-green')
  })

  it('applies amber variant for pending_resolution', () => {
    render(<StatusBadge status="pending_resolution" />)
    const badge = screen.getByText('PENDING RESOLUTION')
    expect(badge.className).toContain('text-accent-amber')
  })

  it('applies red variant for resolved_no', () => {
    render(<StatusBadge status="resolved_no" />)
    const badge = screen.getByText('RESOLVED NO')
    expect(badge.className).toContain('text-accent-red')
  })

  it('applies green variant for yes bet side', () => {
    render(<StatusBadge status="yes" />)
    expect(screen.getByText('YES').className).toContain('text-accent-green')
  })

  it('applies red variant for no bet side', () => {
    render(<StatusBadge status="no" />)
    expect(screen.getByText('NO').className).toContain('text-accent-red')
  })

  it('falls back to neutral for unknown status', () => {
    render(<StatusBadge status="unknown" />)
    expect(screen.getByText('UNKNOWN').className).toContain('text-text-tertiary')
  })

  it('allows variant override', () => {
    render(<StatusBadge status="active" variant="red" />)
    expect(screen.getByText('ACTIVE').className).toContain('text-accent-red')
  })

  it('applies base badge styles', () => {
    render(<StatusBadge status="active" />)
    const badge = screen.getByText('ACTIVE')
    expect(badge.className).toContain('rounded-full')
    expect(badge.className).toContain('text-xs')
    expect(badge.className).toContain('font-medium')
  })
})
