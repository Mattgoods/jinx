import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { Card, Button, StatusBadge, TokenAmount, ProbabilityBar, LoadingState, PageHeader, CountdownTimer } from '../components/ui'

interface Market {
  id: string
  creator_id: string
  target_user_id: string
  secret_word: string | null
  window_start: string
  window_end: string
  status: string
  total_pool: number
  yes_pool: number
  no_pool: number
  creator_display_name: string
  target_display_name: string
}

interface GroupInfo {
  id: string
  name: string
  invite_code: string
  admin_user_id: string
  members: Array<{ user_id: string; display_name: string; avatar_url: string | null; token_balance: number }>
  isAdmin: boolean
}

type StatusFilter = '' | 'active' | 'pending_resolution' | 'resolved_yes' | 'resolved_no' | 'cancelled'

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending_resolution' },
  { label: 'Resolved Yes', value: 'resolved_yes' },
  { label: 'Resolved No', value: 'resolved_no' },
  { label: 'Cancelled', value: 'cancelled' },
]

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const api = useApiClient()
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    api(`/groups/detail?groupId=${groupId}`)
      .then((res: { data: { group: GroupInfo } }) => setGroup(res.data.group))
      .catch(console.error)
  }, [api, groupId])

  // Initial load
  useEffect(() => {
    if (!groupId) return
    api(`/markets?groupId=${groupId}`)
      .then((res: { data: { markets: Market[] } }) => setMarkets(res.data.markets))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [api, groupId])

  function handleFilterChange(filter: StatusFilter) {
    setStatusFilter(filter)
    setLoading(true)
    const url = filter
      ? `/markets?groupId=${groupId}&status=${filter}`
      : `/markets?groupId=${groupId}`
    api(url)
      .then((res: { data: { markets: Market[] } }) => setMarkets(res.data.markets))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  if (!group) {
    return <LoadingState />
  }

  return (
    <div>
      <PageHeader title={group.name} backTo="/dashboard" backLabel="Dashboard">
        <div className="flex gap-2">
          <Button as="link" to={`/group/${groupId}/markets/new`} size="sm">
            New Market
          </Button>
          <Button as="link" to={`/group/${groupId}/leaderboard`} variant="ghost" size="sm">
            Leaderboard
          </Button>
          {group.isAdmin && (
            <Button as="link" to={`/group/${groupId}/settings`} variant="ghost" size="sm">
              Settings
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Group stats bar */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-bg-surface p-4 text-center stat-card-green">
          <p className="font-mono text-2xl font-bold text-accent-green">{group.members.length}</p>
          <p className="text-xs text-text-secondary">Members</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-surface p-4 text-center stat-card-amber">
          <p className="font-mono text-2xl font-bold text-accent-amber">{markets.length}</p>
          <p className="text-xs text-text-secondary">Markets</p>
        </div>
        <div className="hidden rounded-xl border border-border bg-bg-surface p-4 text-center sm:block stat-card-blue">
          <p className="font-mono text-2xl font-bold text-accent-blue">
            {markets.filter(m => m.status === 'active').length}
          </p>
          <p className="text-xs text-text-secondary">Active</p>
        </div>
      </div>

      {/* Filter + Sort toolbar */}
      <div className="mb-6 flex items-center gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 text-sm text-text-tertiary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium">Filter</span>
        </div>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === f.value
                ? 'bg-accent-green text-bg-primary shadow-[0_0_8px_rgba(0,231,1,0.3)]'
                : 'border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : markets.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="py-8">
            <svg className="mx-auto mb-4 h-12 w-12 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-text-secondary">
              {statusFilter ? 'No markets match this filter.' : 'No markets yet. Create one to get started!'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {markets.map((market) => (
            <Link key={market.id} to={`/markets/${market.id}`} className="block">
              <Card
                animate
                hover
                glow={market.status === 'active' ? 'green' : market.status === 'pending_resolution' ? 'amber' : undefined}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-secondary">
                      Will <span className="font-semibold text-text-primary">{market.target_display_name}</span> say...
                    </p>
                    <p className="mt-0.5 truncate text-lg font-bold text-text-primary">
                      {market.secret_word || 'REDACTED'}
                    </p>
                  </div>
                  <StatusBadge status={market.status} />
                </div>
                <ProbabilityBar yesPool={market.yes_pool} totalPool={market.total_pool} />
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-secondary">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-accent-amber" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16z"/>
                    </svg>
                    <TokenAmount amount={market.total_pool} />
                  </span>
                  <span>By: {market.creator_display_name}</span>
                  <CountdownTimer
                    targetDate={market.window_end}
                    label={market.status === 'active' ? 'Ends in' : undefined}
                    expiredText="Ended"
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
