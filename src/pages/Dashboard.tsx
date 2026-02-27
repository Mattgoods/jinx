import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'

interface Group {
  group_id: string
  group_name: string
  token_balance: number
}

export function Dashboard() {
  const api = useApiClient()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/users/profile')
      .then((res: { data: { memberships: Group[] } }) => {
        setGroups(res.data.memberships || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [api])

  if (loading) {
    return <div className="text-text-secondary">Loading...</div>
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="mb-2 text-2xl font-semibold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
          Welcome to Jinx
        </h2>
        <p className="mb-8 text-text-secondary">
          Create or join a group to start playing.
        </p>
        <div className="flex gap-4">
          <Link
            to="/group/create"
            className="rounded-lg bg-accent-green px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-green/90"
          >
            Create Group
          </Link>
          <Link
            to="/group/join"
            className="rounded-lg border border-border bg-transparent px-6 py-3 font-semibold text-text-secondary transition-colors hover:bg-bg-hover"
          >
            Join Group
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
          Dashboard
        </h1>
        <div className="flex gap-3">
          <Link
            to="/group/create"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-hover"
          >
            Create Group
          </Link>
          <Link
            to="/group/join"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-hover"
          >
            Join Group
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div
            key={group.group_id}
            className="card-enter rounded-xl border border-border bg-bg-surface p-5 transition-colors hover:bg-bg-hover"
          >
            <h3 className="mb-3 text-lg font-semibold text-text-primary">{group.group_name}</h3>
            <p className="mb-4 font-mono text-sm font-semibold text-accent-amber">
              {group.token_balance} tokens
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/group/${group.group_id}/markets/new`}
                className="rounded-lg bg-accent-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-green/90"
              >
                New Market
              </Link>
              <Link
                to={`/group/${group.group_id}/leaderboard`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-hover"
              >
                Leaderboard
              </Link>
              <Link
                to={`/group/${group.group_id}/settings`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-hover"
              >
                Settings
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
