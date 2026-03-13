import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MarketDetailPage } from './MarketDetailPage'

const mockApi = vi.fn()
const mockAddToast = vi.fn()

vi.mock('../lib/api.ts', () => ({
  useApiClient: () => mockApi,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: 'market-1' }),
  }
})

vi.mock('../components/ui', async () => {
  const actual = await vi.importActual('../components/ui')
  return {
    ...actual,
    useToast: () => ({ addToast: mockAddToast }),
    CountdownTimer: ({ expiredText }: { expiredText?: string }) => (
      <span>{expiredText ?? 'countdown'}</span>
    ),
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <MarketDetailPage />
    </MemoryRouter>,
  )
}

const baseMarket = {
  id: 'market-1',
  group_id: 'group-1',
  creator_id: 'user-creator',
  target_user_id: 'user-target',
  secret_word: 'banana',
  window_start: '2026-01-01T00:00:00Z',
  window_end: '2026-01-02T00:00:00Z',
  total_pool: 500,
  yes_pool: 300,
  no_pool: 200,
  target_display_name: 'Alice',
  creator_display_name: 'Bob',
}

const sampleBets = [
  { id: 'bet-1', user_id: 'user-1', side: 'yes' as const, amount: 200, payout: 333, display_name: 'Charlie' },
  { id: 'bet-2', user_id: 'user-2', side: 'yes' as const, amount: 100, payout: 166, display_name: 'Dana' },
  { id: 'bet-3', user_id: 'user-3', side: 'no' as const, amount: 200, payout: 0, display_name: 'Eve' },
]

describe('MarketDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockApi.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders market details', async () => {
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'active' }, bets: [], isTarget: false, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('banana')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('shows resolution banner for resolved_yes market', async () => {
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'resolved_yes' }, bets: sampleBets, isTarget: false, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Resolved: YES')).toBeInTheDocument()
      expect(screen.getByText(/said the secret word/)).toBeInTheDocument()
    })
  })

  it('shows resolution banner for resolved_no market', async () => {
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'resolved_no' }, bets: sampleBets, isTarget: false, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Resolved: NO')).toBeInTheDocument()
      expect(screen.getByText(/did not say the secret word/)).toBeInTheDocument()
    })
  })

  it('shows cancelled market banner', async () => {
    const cancelledBets = [
      { id: 'bet-1', user_id: 'user-1', side: 'yes' as const, amount: 200, payout: 200, display_name: 'Charlie' },
    ]
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'cancelled' }, bets: cancelledBets, isTarget: false, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Market Cancelled')).toBeInTheDocument()
      expect(screen.getByText(/All bets have been refunded/)).toBeInTheDocument()
    })
  })

  it('shows payout P/L on resolved market bets', async () => {
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'resolved_yes' }, bets: sampleBets, isTarget: false, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      // Charlie: 333 - 200 = +133
      expect(screen.getByText('+133')).toBeInTheDocument()
      // Dana: 166 - 100 = +66
      expect(screen.getByText('+66')).toBeInTheDocument()
      // Eve: 0 - 200 = -200
      expect(screen.getByText('-200')).toBeInTheDocument()
    })
  })

  it('does not show P/L for active market bets', async () => {
    const activeBets = [
      { id: 'bet-1', user_id: 'user-1', side: 'yes' as const, amount: 200, payout: null, display_name: 'Charlie' },
    ]
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'active' }, bets: activeBets, isTarget: false, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Charlie')).toBeInTheDocument()
    })
    // No P/L text should appear
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
  })

  it('does not show resolution banner for active markets', async () => {
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'active' }, bets: [], isTarget: false, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('banana')).toBeInTheDocument()
    })
    expect(screen.queryByText('Resolved: YES')).not.toBeInTheDocument()
    expect(screen.queryByText('Resolved: NO')).not.toBeInTheDocument()
    expect(screen.queryByText('Market Cancelled')).not.toBeInTheDocument()
  })

  it('shows target warning when user is target', async () => {
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'active' }, bets: [], isTarget: true, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/You are the target of this market/)).toBeInTheDocument()
    })
  })

  it('shows REDACTED for target user secret word', async () => {
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'active', secret_word: null }, bets: [], isTarget: true, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('REDACTED')).toBeInTheDocument()
    })
  })

  it('shows waiting message for non-target on pending_resolution', async () => {
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'pending_resolution' }, bets: [], isTarget: false, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Waiting for Alice to resolve/)).toBeInTheDocument()
    })
  })

  it('shows prompted message for target on pending_resolution', async () => {
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'pending_resolution' }, bets: [], isTarget: true, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/You will be prompted to resolve this market/)).toBeInTheDocument()
    })
  })

  it('does not show resolve link for active markets', async () => {
    mockApi.mockResolvedValue({
      data: { market: { ...baseMarket, status: 'active' }, bets: [], isTarget: false, userBalance: 1000 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('banana')).toBeInTheDocument()
    })
    expect(screen.queryByText(/Waiting for/)).not.toBeInTheDocument()
    expect(screen.queryByText(/prompted to resolve/)).not.toBeInTheDocument()
  })
})
