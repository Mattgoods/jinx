import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BettingHistoryPage } from './BettingHistoryPage'

const mockApi = vi.fn()

vi.mock('../lib/api.ts', () => ({
  useApiClient: () => mockApi,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <BettingHistoryPage />
    </MemoryRouter>,
  )
}

const sampleGroups = [
  { id: 'group-1', name: 'Test Group' },
  { id: 'group-2', name: 'Other Group' },
]

const sampleBets = [
  {
    id: 'bet-1',
    side: 'yes' as const,
    amount: 100,
    payout: 180,
    created_at: '2026-02-20T12:00:00Z',
    market_id: 'market-1',
    group_id: 'group-1',
    group_name: 'Test Group',
    market_target: 'Alice',
    secret_word: 'banana',
    market_status: 'resolved_yes',
    window_end: '2026-02-21T12:00:00Z',
    yes_pool: 200,
    no_pool: 100,
    total_pool: 300,
  },
  {
    id: 'bet-2',
    side: 'no' as const,
    amount: 50,
    payout: 0,
    created_at: '2026-02-19T10:00:00Z',
    market_id: 'market-2',
    group_id: 'group-2',
    group_name: 'Other Group',
    market_target: 'Bob',
    secret_word: 'apple',
    market_status: 'resolved_no',
    window_end: '2026-02-20T10:00:00Z',
    yes_pool: 80,
    no_pool: 50,
    total_pool: 130,
  },
  {
    id: 'bet-3',
    side: 'yes' as const,
    amount: 75,
    payout: null,
    created_at: '2026-02-25T08:00:00Z',
    market_id: 'market-3',
    group_id: 'group-1',
    group_name: 'Test Group',
    market_target: 'Charlie',
    secret_word: null,
    market_status: 'active',
    window_end: '2026-03-01T08:00:00Z',
    yes_pool: 150,
    no_pool: 50,
    total_pool: 200,
  },
]

describe('BettingHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockApi.mockReturnValue(new Promise(() => {})) // never resolves
    renderPage()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders bet entries after loading', async () => {
    mockApi.mockResolvedValue({ data: { bets: sampleBets, groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('shows empty state when no bets', async () => {
    mockApi.mockResolvedValue({ data: { bets: [], groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No bets found.')).toBeInTheDocument()
    })
    expect(screen.getByText('Place your first bet on a market to see it here.')).toBeInTheDocument()
  })

  it('displays summary stats', async () => {
    mockApi.mockResolvedValue({ data: { bets: sampleBets, groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      // Total bets count
      expect(screen.getByText('3')).toBeInTheDocument()
      // Total Wagered = 100 + 50 + 75 = 225
      expect(screen.getByText('225')).toBeInTheDocument()
    })
    // Net P/L: (180-100) + (0-50) = +30
    expect(screen.getByText('+30')).toBeInTheDocument()
    // Win Rate: 1 / 2 = 50%
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('shows secret word or REDACTED', async () => {
    mockApi.mockResolvedValue({ data: { bets: sampleBets, groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/banana/)).toBeInTheDocument()
      expect(screen.getByText(/apple/)).toBeInTheDocument()
      expect(screen.getByText(/REDACTED/)).toBeInTheDocument()
    })
  })

  it('renders group filter dropdown with all groups', async () => {
    mockApi.mockResolvedValue({ data: { bets: sampleBets, groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
    })

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3) // All Groups + 2 groups
    expect(options[0]).toHaveTextContent('All Groups')
    expect(options[1]).toHaveTextContent('Test Group')
    expect(options[2]).toHaveTextContent('Other Group')
  })

  it('fetches filtered bets when group is selected', async () => {
    const user = userEvent.setup()
    mockApi.mockResolvedValue({ data: { bets: sampleBets, groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    // First call was for all bets
    expect(mockApi).toHaveBeenCalledWith('/users/bets')

    // Select a specific group
    await user.selectOptions(screen.getByRole('combobox'), 'group-1')

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/users/bets?groupId=group-1')
    })
  })

  it('shows P/L for settled bets', async () => {
    mockApi.mockResolvedValue({ data: { bets: [sampleBets[0]], groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      // Bet 1: payout 180 - amount 100 = +80
      // Appears in both summary and bet row; verify both exist
      const matches = screen.getAllByText('+80')
      expect(matches.length).toBe(2)
    })
  })

  it('shows potential payout for unsettled bets', async () => {
    mockApi.mockResolvedValue({ data: { bets: [sampleBets[2]], groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      // Bet 3: floor(75/150 * 200) = 100
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('Potential')).toBeInTheDocument()
    })
  })

  it('displays status badges for bet side and market status', async () => {
    mockApi.mockResolvedValue({ data: { bets: [sampleBets[0]], groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('YES')).toBeInTheDocument()
      expect(screen.getByText('RESOLVED YES')).toBeInTheDocument()
    })
  })

  it('renders bet entries as links to market detail', async () => {
    mockApi.mockResolvedValue({ data: { bets: [sampleBets[0]], groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Alice/ })
      expect(link).toHaveAttribute('href', '/markets/market-1')
    })
  })

  it('renders the page title', async () => {
    mockApi.mockResolvedValue({ data: { bets: [], groups: [] } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Betting History')).toBeInTheDocument()
    })
  })

  it('shows loss P/L with negative value', async () => {
    mockApi.mockResolvedValue({ data: { bets: [sampleBets[1]], groups: sampleGroups } })
    renderPage()

    await waitFor(() => {
      // Bet 2: payout 0 - amount 50 = -50
      // Appears in both summary Net P/L and bet row P/L
      const matches = screen.getAllByText('-50')
      expect(matches.length).toBe(2)
    })
  })
})
