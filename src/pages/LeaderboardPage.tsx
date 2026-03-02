import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { Card, Avatar, LoadingState, PageHeader } from '../components/ui'

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
  const { groupId } = useParams<{ groupId: string }>()
  const api = useApiClient()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api(`/leaderboard?groupId=${groupId}`)
      .then((res: { data: { leaderboard: LeaderboardEntry[] } }) => {
        setEntries(res.data.leaderboard)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [api, groupId])

  if (loading) {
    return <LoadingState />
  }

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'text-accent-amber text-2xl'
    if (rank === 2) return 'text-text-secondary text-xl'
    if (rank === 3) return 'text-accent-red text-xl'
    return 'text-text-tertiary text-lg'
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '\uD83E\uDD47'
    if (rank === 2) return '\uD83E\uDD48'
    if (rank === 3) return '\uD83E\uDD49'
    return null
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Leaderboard" backTo={`/group/${groupId}`} backLabel="Group" />

      {entries.length === 0 ? (
        <Card className="text-center">
          <div className="py-8">
            <svg className="mx-auto mb-4 h-12 w-12 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-text-secondary">No resolved bets yet.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const rankIcon = getRankIcon(entry.rank)
            return (
              <Card key={entry.userId} className="flex items-center justify-between px-5 py-4" hover>
                <div className="flex items-center gap-4">
                  <span className={`w-10 text-center font-mono font-bold ${getRankStyle(entry.rank)}`}>
                    {rankIcon || entry.rank}
                  </span>
                  <Avatar src={entry.avatarUrl} name={entry.displayName} />
                  <span className="font-semibold text-text-primary">{entry.displayName}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className={`font-mono font-bold text-lg ${entry.profitLoss >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {entry.profitLoss >= 0 ? '+' : ''}{entry.profitLoss.toLocaleString()}
                  </span>
                  <div className="hidden sm:flex sm:items-center sm:gap-4">
                    <span className="text-text-secondary">{entry.totalBets} bets</span>
                    <span className="text-text-secondary">{(entry.winRate * 100).toFixed(0)}% win</span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
