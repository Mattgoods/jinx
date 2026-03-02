import { useState, useEffect } from 'react'
import { useApiClient } from '../lib/api.ts'
import { Card, Avatar, StatusBadge, TokenAmount, LoadingState } from '../components/ui'

interface Profile {
  user: { id: string; display_name: string; avatar_url: string | null }
  memberships: Array<{ group_id: string; group_name: string; token_balance: number }>
  betHistory: Array<{
    id: string
    market_target: string
    secret_word: string | null
    side: 'yes' | 'no'
    amount: number
    payout: number | null
    status: string
  }>
  stats: { lifetimePL: number; totalBets: number; winRate: number }
}

export function ProfilePage() {
  const api = useApiClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/users/profile')
      .then((res: { data: Profile }) => setProfile(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [api])

  if (loading || !profile) {
    return <LoadingState />
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Profile header */}
      <div className="mb-8 flex items-center gap-5">
        <Avatar src={profile.user.avatar_url} name={profile.user.display_name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
            {profile.user.display_name}
          </h1>
          <p className="text-sm text-text-secondary">Player Profile</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <Card className="text-center stat-card-green">
          <p className={`font-mono text-2xl font-bold ${profile.stats.lifetimePL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {profile.stats.lifetimePL >= 0 ? '+' : ''}{profile.stats.lifetimePL.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-secondary">Lifetime P/L</p>
        </Card>
        <Card className="text-center stat-card-blue">
          <p className="font-mono text-2xl font-bold text-text-primary">{profile.stats.totalBets}</p>
          <p className="mt-1 text-xs text-text-secondary">Total Bets</p>
        </Card>
        <Card className="text-center stat-card-amber">
          <p className="font-mono text-2xl font-bold text-accent-amber">{(profile.stats.winRate * 100).toFixed(0)}%</p>
          <p className="mt-1 text-xs text-text-secondary">Win Rate</p>
        </Card>
      </div>

      {/* Balances */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-text-primary">
          <svg className="h-5 w-5 text-accent-amber" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16z"/>
          </svg>
          Balances
        </h2>
        <div className="space-y-2">
          {profile.memberships.map((m) => (
            <div key={m.group_id} className="flex items-center justify-between rounded-xl border border-border bg-bg-surface px-5 py-3.5 transition-colors hover:bg-bg-hover">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-green/10">
                  <svg className="h-4 w-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-text-primary font-medium">{m.group_name}</span>
              </div>
              <TokenAmount amount={m.token_balance} />
            </div>
          ))}
        </div>
      </div>

      {/* Bet History */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-text-primary">
          <svg className="h-5 w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent Bets
        </h2>
        {profile.betHistory.length === 0 ? (
          <Card className="text-center">
            <p className="py-4 text-sm text-text-tertiary">No bets yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {profile.betHistory.map((bet) => (
              <div key={bet.id} className="flex items-center justify-between rounded-xl border border-border bg-bg-surface px-5 py-3.5 transition-colors hover:bg-bg-hover">
                <div className="flex items-center gap-3">
                  <span className="text-text-primary font-medium">{bet.market_target}</span>
                  <span className="text-sm text-text-secondary">
                    {bet.secret_word || 'REDACTED'}
                  </span>
                  <StatusBadge status={bet.side} />
                </div>
                <div className="flex items-center gap-3 text-right">
                  <TokenAmount amount={bet.amount} className="text-sm" />
                  {bet.payout !== null && (
                    <span className={`font-mono text-sm font-semibold ${
                      bet.payout - bet.amount >= 0 ? 'text-accent-green' : 'text-accent-red'
                    }`}>
                      {bet.payout - bet.amount >= 0 ? '+' : ''}{bet.payout - bet.amount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
