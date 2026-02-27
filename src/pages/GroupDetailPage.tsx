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
    api(`/groups/${groupId}`)
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
    <div className="mx-auto max-w-3xl py-6">
      <PageHeader title={group.name}>
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

      {/* Status filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-accent-green text-white'
                : 'border border-border text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : markets.length === 0 ? (
        <Card>
          <p className="text-center text-text-tertiary">
            {statusFilter ? 'No markets match this filter.' : 'No markets yet. Create one to get started!'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {markets.map((market) => (
            <Link key={market.id} to={`/markets/${market.id}`} className="block">
              <Card animate className="transition-colors hover:bg-bg-hover">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">
                      Will <span className="font-semibold text-text-primary">{market.target_display_name}</span> say...
                    </p>
                    <p className="mt-0.5 text-lg font-bold text-text-primary">
                      {market.secret_word || 'REDACTED'}
                    </p>
                  </div>
                  <StatusBadge status={market.status} />
                </div>
                <ProbabilityBar yesPool={market.yes_pool} totalPool={market.total_pool} />
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-secondary">
                  <span>Pool: <TokenAmount amount={market.total_pool} /></span>
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
