import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

  it('renders a back link when backTo is provided', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Settings" backTo="/dashboard" backLabel="Dashboard" />
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: /Dashboard/ })
    expect(link).toHaveAttribute('href', '/dashboard')
  })

  it('uses "Back" as default back label', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Page" backTo="/home" />
      </MemoryRouter>
    )
    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('does not render a back link when backTo is omitted', () => {
    render(<PageHeader title="No Back" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
