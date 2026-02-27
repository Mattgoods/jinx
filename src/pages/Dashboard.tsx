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
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="mb-2 text-2xl font-semibold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
          Welcome to Jinx
        </h2>
        <p className="mb-8 text-text-secondary">
          Create or join a group to start playing.
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
      <PageHeader title="Dashboard">
        <div className="flex gap-3">
          <Button as="link" to="/group/create" variant="ghost" size="md">Create Group</Button>
          <Button as="link" to="/group/join" variant="ghost" size="md">Join Group</Button>
        </div>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Link key={group.group_id} to={`/group/${group.group_id}`} className="block">
            <Card animate className="transition-colors hover:bg-bg-hover">
              <h3 className="mb-3 text-lg font-semibold text-text-primary">{group.group_name}</h3>
              <p className="mb-4 text-sm">
                <TokenAmount amount={group.token_balance} /> <span className="text-text-secondary">tokens</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button as="link" to={`/group/${group.group_id}/markets/new`} size="sm" onClick={(e) => e.stopPropagation()}>
                  New Market
                </Button>
                <Button as="link" to={`/group/${group.group_id}/leaderboard`} variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  Leaderboard
                </Button>
                <Button as="link" to={`/group/${group.group_id}/settings`} variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  Settings
                </Button>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
