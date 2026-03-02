import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { Card, StatusBadge, TokenAmount, LoadingState, PageHeader } from '../components/ui'

interface BetEntry {
  id: string
  side: 'yes' | 'no'
  amount: number
  payout: number | null
  created_at: string
  market_id: string
  group_id: string
  group_name: string
  market_target: string
  secret_word: string | null
  market_status: string
  window_end: string
  yes_pool: number
  no_pool: number
  total_pool: number
}

interface GroupOption {
  id: string
  name: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function computePotentialPayout(bet: BetEntry): number | null {
  if (bet.payout !== null) return null
  const winningPool = bet.side === 'yes' ? bet.yes_pool : bet.no_pool
  if (winningPool === 0 || bet.total_pool === 0) return bet.amount
  return Math.floor((bet.amount / winningPool) * bet.total_pool)
}

export function BettingHistoryPage() {
  const api = useApiClient()
  const [bets, setBets] = useState<BetEntry[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const path = selectedGroup === 'all' ? '/users/bets' : `/users/bets?groupId=${selectedGroup}`
    api(path)
      .then((res: { data: { bets: BetEntry[]; groups: GroupOption[] } }) => {
        setBets(res.data.bets)
        setGroups(res.data.groups)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [api, selectedGroup])

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGroup(e.target.value)
  }

  // Aggregate stats for displayed bets
  const resolvedBets = bets.filter((b) => b.payout !== null)
  const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0)
  const totalPL = resolvedBets.reduce((sum, b) => sum + ((b.payout ?? 0) - b.amount), 0)
  const wins = resolvedBets.filter((b) => (b.payout ?? 0) > b.amount).length
  const winRate = resolvedBets.length > 0 ? wins / resolvedBets.length : 0

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Betting History" backTo="/dashboard" backLabel="Dashboard">
        <select
          value={selectedGroup}
          onChange={handleGroupChange}
          className="rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-colors"
        >
          <option value="all">All Groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </PageHeader>

      {/* Summary stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="text-center stat-card-blue">
          <p className="font-mono text-2xl font-bold text-text-primary">{bets.length}</p>
          <p className="mt-1 text-xs text-text-secondary">Total Bets</p>
        </Card>
        <Card className="text-center stat-card-amber">
          <p className="font-mono text-2xl font-bold text-accent-amber">{totalWagered.toLocaleString()}</p>
          <p className="mt-1 text-xs text-text-secondary">Total Wagered</p>
        </Card>
        <Card className="text-center stat-card-green">
          <p className={`font-mono text-2xl font-bold ${totalPL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {totalPL >= 0 ? '+' : ''}{totalPL}
          </p>
          <p className="mt-1 text-xs text-text-secondary">Net P/L</p>
        </Card>
        <Card className="text-center stat-card-red">
          <p className="font-mono text-2xl font-bold text-text-primary">
            {(winRate * 100).toFixed(0)}%
          </p>
          <p className="mt-1 text-xs text-text-secondary">Win Rate</p>
        </Card>
      </div>

      {loading ? (
        <LoadingState />
      ) : bets.length === 0 ? (
        <Card className="py-12 text-center">
          <svg className="mx-auto mb-4 h-12 w-12 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-text-secondary">No bets found.</p>
          <p className="mt-1 text-sm text-text-tertiary">
            Place your first bet on a market to see it here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => {
            const pl = bet.payout !== null ? bet.payout - bet.amount : null
            const potentialPayout = computePotentialPayout(bet)
            const isSettled = bet.payout !== null

            return (
              <Link key={bet.id} to={`/markets/${bet.market_id}`} className="block">
                <Card hover className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: market info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-text-primary">{bet.market_target}</span>
                        <span className="text-sm text-text-secondary">
                          &ldquo;{bet.secret_word || 'REDACTED'}&rdquo;
                        </span>
                        <StatusBadge status={bet.side} />
                        <StatusBadge status={bet.market_status} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
                        <span>{bet.group_name}</span>
                        <span>·</span>
                        <span>Placed {formatDateTime(bet.created_at)}</span>
                        <span>·</span>
                        <span>Window ends {formatDate(bet.window_end)}</span>
                      </div>
                    </div>

                    {/* Right: financials */}
                    <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary">Wagered</span>
                        <TokenAmount amount={bet.amount} />
                      </div>
                      {isSettled && pl !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-tertiary">P/L</span>
                          <span
                            className={`font-mono text-sm font-semibold ${
                              pl >= 0 ? 'text-accent-green' : 'text-accent-red'
                            }`}
                          >
                            {pl >= 0 ? '+' : ''}{pl}
                          </span>
                        </div>
                      ) : potentialPayout !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-tertiary">Potential</span>
                          <span className="font-mono text-sm text-text-secondary">
                            {potentialPayout}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
