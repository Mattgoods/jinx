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

  return (
    <div className="mx-auto max-w-2xl py-6">
      <PageHeader title="Leaderboard" backTo={`/group/${groupId}`} backLabel="Group" />
      {entries.length === 0 ? (
        <p className="text-text-tertiary">No resolved bets yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.userId} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                <span className="w-8 text-center font-mono text-lg font-bold text-text-tertiary">
                  {entry.rank}
                </span>
                <Avatar src={entry.avatarUrl} name={entry.displayName} />
                <span className="font-semibold text-text-primary">{entry.displayName}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className={`font-mono font-semibold ${entry.profitLoss >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {entry.profitLoss >= 0 ? '+' : ''}{entry.profitLoss}
                </span>
                <span className="text-text-secondary">{entry.totalBets} bets</span>
                <span className="text-text-secondary">{(entry.winRate * 100).toFixed(0)}% win</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
