import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { Button, Card, TokenAmount, LoadingState, PageHeader } from '../components/ui'

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
    return <LoadingState />
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-green/10 ring-1 ring-accent-green/20">
          <svg className="h-10 w-10 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
          Welcome to Jinx
        </h2>
        <p className="mb-8 max-w-sm text-center text-text-secondary">
          Create or join a group to start betting on what your friends will say.
        </p>
        <div className="flex gap-4">
          <Button as="link" to="/group/create" size="lg">Create Group</Button>
          <Button as="link" to="/group/join" variant="ghost" size="lg">Join Group</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="My Groups">
        <div className="flex gap-3">
          <Button as="link" to="/group/create" variant="ghost" size="sm">Create Group</Button>
          <Button as="link" to="/group/join" variant="ghost" size="sm">Join Group</Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Link key={group.group_id} to={`/group/${group.group_id}`} className="block">
            <Card animate hover padding="lg">
              {/* Group icon */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-green/10">
                <svg className="h-6 w-6 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-bold text-text-primary">{group.group_name}</h3>
              <div className="mb-4 flex items-center gap-2">
                <div className="online-dot" />
                <span className="text-sm text-text-secondary">Balance:</span>
                <TokenAmount amount={group.token_balance} animate />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button as="link" to={`/group/${group.group_id}/markets/new`} size="sm" onClick={(e) => e.stopPropagation()}>
                  New Market
                </Button>
                <Button as="link" to={`/group/${group.group_id}/leaderboard`} variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  Leaderboard
                </Button>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
