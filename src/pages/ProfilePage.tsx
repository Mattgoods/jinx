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
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6 flex items-center gap-4">
        <Avatar src={profile.user.avatar_url} name={profile.user.display_name} size="lg" />
        <h1 className="text-2xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
          {profile.user.display_name}
        </h1>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card className="text-center">
          <p className={`font-mono text-xl font-bold ${profile.stats.lifetimePL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {profile.stats.lifetimePL >= 0 ? '+' : ''}{profile.stats.lifetimePL}
          </p>
          <p className="text-sm text-text-secondary">Lifetime P/L</p>
        </Card>
        <Card className="text-center">
          <p className="font-mono text-xl font-bold text-text-primary">{profile.stats.totalBets}</p>
          <p className="text-sm text-text-secondary">Total Bets</p>
        </Card>
        <Card className="text-center">
          <p className="font-mono text-xl font-bold text-text-primary">{(profile.stats.winRate * 100).toFixed(0)}%</p>
          <p className="text-sm text-text-secondary">Win Rate</p>
        </Card>
      </div>

      {/* Balances */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Balances</h2>
        <div className="space-y-2">
          {profile.memberships.map((m) => (
            <div key={m.group_id} className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-3">
              <span className="text-text-primary">{m.group_name}</span>
              <TokenAmount amount={m.token_balance} />
            </div>
          ))}
        </div>
      </div>

      {/* Bet History */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Bet History</h2>
        {profile.betHistory.length === 0 ? (
          <p className="text-sm text-text-tertiary">No bets yet.</p>
        ) : (
          <div className="space-y-2">
            {profile.betHistory.map((bet) => (
              <div key={bet.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-3">
                <div>
                  <span className="text-text-primary">{bet.market_target}</span>
                  <span className="ml-2 text-sm text-text-secondary">
                    {bet.secret_word || 'REDACTED'}
                  </span>
                  <StatusBadge status={bet.side} className="ml-2" />
                </div>
                <div className="text-right">
                  <TokenAmount amount={bet.amount} className="text-sm" />
                  {bet.payout !== null && (
                    <span className={`ml-2 font-mono text-sm ${
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
