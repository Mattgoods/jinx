import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders the title as an h1', () => {
    render(<PageHeader title="Test" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test')
  })

  it('renders children alongside the title', () => {
    render(
      <PageHeader title="Markets">
        <button>New Market</button>
      </PageHeader>
    )
    expect(screen.getByText('Markets')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Market' })).toBeInTheDocument()
  })

  it('applies tight tracking style', () => {
    render(<PageHeader title="Styled" />)
    const heading = screen.getByRole('heading')
    expect(heading).toHaveStyle({ letterSpacing: '-0.02em' })
  })
})
