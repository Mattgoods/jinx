import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders an image when src is provided', () => {
    const { container } = render(<Avatar src="https://example.com/avatar.jpg" name="Alice" />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('renders initial fallback when no src', () => {
    render(<Avatar name="Bob" />)
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('renders initial fallback when src is null', () => {
    render(<Avatar src={null} name="Charlie" />)
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('applies sm size', () => {
    render(<Avatar name="Dan" size="sm" />)
    const el = screen.getByText('D')
    expect(el.className).toContain('h-8')
    expect(el.className).toContain('w-8')
  })

  it('applies md size by default', () => {
    render(<Avatar name="Eve" />)
    const el = screen.getByText('E')
    expect(el.className).toContain('h-10')
    expect(el.className).toContain('w-10')
  })

  it('applies lg size', () => {
    render(<Avatar name="Frank" size="lg" />)
    const el = screen.getByText('F')
    expect(el.className).toContain('h-16')
    expect(el.className).toContain('w-16')
  })

  it('uppercases the initial', () => {
    render(<Avatar name="alice" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
