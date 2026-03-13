import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ResolutionModal } from './ResolutionModal'

const mockApi = vi.fn()
const mockAddToast = vi.fn()

vi.mock('../lib/api.ts', () => ({
  useApiClient: () => mockApi,
}))

vi.mock('./ui', async () => {
  const actual = await vi.importActual('./ui')
  return {
    ...actual,
    useToast: () => ({ addToast: mockAddToast }),
  }
})

function renderModal() {
  return render(
    <MemoryRouter>
      <ResolutionModal />
    </MemoryRouter>,
  )
}

const pendingMarkets = [
  {
    id: 'market-1',
    group_id: 'group-1',
    secret_word: 'banana',
    target_display_name: 'Alice',
    total_pool: 500,
    yes_pool: 300,
    no_pool: 200,
    window_end: '2026-01-02T00:00:00Z',
  },
  {
    id: 'market-2',
    group_id: 'group-1',
    secret_word: 'elephant',
    target_display_name: 'Alice',
    total_pool: 1000,
    yes_pool: 600,
    no_pool: 400,
    window_end: '2026-01-03T00:00:00Z',
  },
]

describe('ResolutionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when no pending markets', async () => {
    mockApi.mockResolvedValue({ data: { markets: [] } })
    const { container } = renderModal()
    await waitFor(() => {
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
    })
  })

  it('renders modal with secret word when pending market exists', async () => {
    mockApi.mockResolvedValue({ data: { markets: [pendingMarkets[0]] } })
    renderModal()
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/banana/)).toBeInTheDocument()
      expect(screen.getByText('Time to Resolve!')).toBeInTheDocument()
    })
  })

  it('has no close button or dismiss mechanism', async () => {
    mockApi.mockResolvedValue({ data: { markets: [pendingMarkets[0]] } })
    renderModal()
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    // No close button
    expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument()
    expect(screen.queryByText('×')).not.toBeInTheDocument()
  })

  it('shows YES and NO resolution buttons', async () => {
    mockApi.mockResolvedValue({ data: { markets: [pendingMarkets[0]] } })
    renderModal()
    await waitFor(() => {
      expect(screen.getByText("Yes, I said it")).toBeInTheDocument()
      expect(screen.getByText("No, I didn't")).toBeInTheDocument()
    })
  })

  it('resolves market with YES and shows toast', async () => {
    const user = userEvent.setup()
    // First call: fetch pending markets; second call: resolve
    mockApi
      .mockResolvedValueOnce({ data: { markets: [pendingMarkets[0]] } })
      .mockResolvedValueOnce({ data: { market: { id: 'market-1', status: 'resolved_yes' } } })
    renderModal()
    await waitFor(() => {
      expect(screen.getByText("Yes, I said it")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Yes, I said it"))
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/markets/resolve', {
        method: 'POST',
        body: JSON.stringify({ marketId: 'market-1', outcome: 'yes' }),
      })
      expect(mockAddToast).toHaveBeenCalledWith('Market resolved as YES!', 'success')
    })
  })

  it('resolves market with NO and shows toast', async () => {
    const user = userEvent.setup()
    mockApi
      .mockResolvedValueOnce({ data: { markets: [pendingMarkets[0]] } })
      .mockResolvedValueOnce({ data: { market: { id: 'market-1', status: 'resolved_no' } } })
    renderModal()
    await waitFor(() => {
      expect(screen.getByText("No, I didn't")).toBeInTheDocument()
    })
    await user.click(screen.getByText("No, I didn't"))
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/markets/resolve', {
        method: 'POST',
        body: JSON.stringify({ marketId: 'market-1', outcome: 'no' }),
      })
      expect(mockAddToast).toHaveBeenCalledWith('Market resolved as NO!', 'success')
    })
  })

  it('shows counter when multiple pending markets exist', async () => {
    mockApi.mockResolvedValue({ data: { markets: pendingMarkets } })
    renderModal()
    await waitFor(() => {
      expect(screen.getByText('Market 1 of 2')).toBeInTheDocument()
      // First market's secret word shown
      expect(screen.getByText(/banana/)).toBeInTheDocument()
    })
  })

  it('shows next market after resolving first one', async () => {
    const user = userEvent.setup()
    mockApi
      .mockResolvedValueOnce({ data: { markets: [...pendingMarkets] } })
      .mockResolvedValueOnce({ data: { market: { id: 'market-1', status: 'resolved_yes' } } })
    renderModal()
    await waitFor(() => {
      expect(screen.getByText(/banana/)).toBeInTheDocument()
    })
    await user.click(screen.getByText("Yes, I said it"))
    await waitFor(() => {
      // Second market's secret word now shown
      expect(screen.getByText(/elephant/)).toBeInTheDocument()
    })
  })

  it('shows pool amount', async () => {
    mockApi.mockResolvedValue({ data: { markets: [pendingMarkets[0]] } })
    renderModal()
    await waitFor(() => {
      expect(screen.getByText('500')).toBeInTheDocument()
    })
  })

  it('shows error message on resolve failure', async () => {
    const user = userEvent.setup()
    mockApi
      .mockResolvedValueOnce({ data: { markets: [pendingMarkets[0]] } })
      .mockRejectedValueOnce(new Error('Network error'))
    renderModal()
    await waitFor(() => {
      expect(screen.getByText("Yes, I said it")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Yes, I said it"))
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })
})
