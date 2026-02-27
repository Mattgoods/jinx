import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider } from './Toast'
import { useToast } from './useToast'

// Helper that renders a button to trigger toasts
function ToastTrigger({ message = 'Test toast', variant }: { message?: string; variant?: 'success' | 'error' | 'info' }) {
  const { addToast } = useToast()
  return (
    <button onClick={() => addToast(message, variant)}>
      Add Toast
    </button>
  )
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('renders nothing when no toasts exist', () => {
    renderWithProvider(<div>Content</div>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a toast when addToast is called', () => {
    renderWithProvider(<ToastTrigger />)
    act(() => {
      fireEvent.click(screen.getByText('Add Toast'))
    })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Test toast')).toBeInTheDocument()
  })

  it('shows success variant by default', () => {
    renderWithProvider(<ToastTrigger />)
    act(() => {
      fireEvent.click(screen.getByText('Add Toast'))
    })
    const toast = screen.getByRole('status')
    expect(toast.className).toContain('border-l-accent-green')
  })

  it('shows error variant', () => {
    renderWithProvider(<ToastTrigger variant="error" />)
    act(() => {
      fireEvent.click(screen.getByText('Add Toast'))
    })
    const toast = screen.getByRole('status')
    expect(toast.className).toContain('border-l-accent-red')
  })

  it('shows info variant', () => {
    renderWithProvider(<ToastTrigger variant="info" />)
    act(() => {
      fireEvent.click(screen.getByText('Add Toast'))
    })
    const toast = screen.getByRole('status')
    expect(toast.className).toContain('border-l-accent-amber')
  })

  it('can show multiple toasts', () => {
    renderWithProvider(<ToastTrigger />)
    act(() => {
      fireEvent.click(screen.getByText('Add Toast'))
      fireEvent.click(screen.getByText('Add Toast'))
    })
    expect(screen.getAllByRole('status')).toHaveLength(2)
  })

  it('auto-dismisses after timeout', () => {
    renderWithProvider(<ToastTrigger />)
    act(() => {
      fireEvent.click(screen.getByText('Add Toast'))
    })
    expect(screen.getByRole('status')).toBeInTheDocument()

    // Advance past auto-dismiss (4000ms) + exit animation (200ms)
    act(() => {
      vi.advanceTimersByTime(4200)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('dismisses on close button click', () => {
    renderWithProvider(<ToastTrigger />)
    act(() => {
      fireEvent.click(screen.getByText('Add Toast'))
    })
    expect(screen.getByRole('status')).toBeInTheDocument()

    act(() => {
      fireEvent.click(screen.getByLabelText('Dismiss'))
    })
    // After exit animation
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('throws error when useToast is used outside provider', () => {
    function BadComponent() {
      useToast()
      return null
    }
    expect(() => render(<BadComponent />)).toThrow('useToast must be used within a ToastProvider')
  })

  it('renders toast container with proper positioning', () => {
    renderWithProvider(<ToastTrigger />)
    act(() => {
      fireEvent.click(screen.getByText('Add Toast'))
    })
    const container = screen.getByLabelText('Notifications')
    expect(container.className).toContain('fixed')
    expect(container.className).toContain('bottom-4')
    expect(container.className).toContain('right-4')
  })
})
