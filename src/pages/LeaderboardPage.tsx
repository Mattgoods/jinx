import { useState, useEffect } from 'react'
import { useApiClient } from '../lib/api.ts'

interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  profitLoss: number
  totalBets: number
  winRate: number
  rank: number
}

export function LeaderboardPage() {
  const api = useApiClient()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/leaderboard')
      .then((res: { data: { leaderboard: LeaderboardEntry[] } }) => {
        setEntries(res.data.leaderboard)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [api])

  if (loading) {
    return <div className="text-text-secondary">Loading...</div>
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
        Leaderboard
      </h1>
      {entries.length === 0 ? (
        <p className="text-text-tertiary">No resolved bets yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.userId} className="flex items-center justify-between rounded-xl border border-border bg-bg-surface px-5 py-4">
              <div className="flex items-center gap-4">
                <span className="w-8 text-center font-mono text-lg font-bold text-text-tertiary">
                  {entry.rank}
                </span>
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-hover text-sm text-text-secondary">
                    {entry.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-semibold text-text-primary">{entry.displayName}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className={`font-mono font-semibold ${entry.profitLoss >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {entry.profitLoss >= 0 ? '+' : ''}{entry.profitLoss}
                </span>
                <span className="text-text-secondary">{entry.totalBets} bets</span>
                <span className="text-text-secondary">{(entry.winRate * 100).toFixed(0)}% win</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
