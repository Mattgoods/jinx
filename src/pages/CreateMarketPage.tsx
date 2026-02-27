import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'

interface GroupMember {
  user_id: string
  display_name: string
}

export function CreateMarketPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const api = useApiClient()
  const navigate = useNavigate()
  const [members, setMembers] = useState<GroupMember[]>([])
  const [targetUserId, setTargetUserId] = useState('')
  const [secretWord, setSecretWord] = useState('')
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api(`/groups/${groupId}`)
      .then((res: { data: { group: { members: GroupMember[] } } }) => {
        setMembers(res.data.group.members || [])
      })
      .catch(console.error)
  }, [api, groupId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await api('/markets/create', {
        method: 'POST',
        body: JSON.stringify({
          groupId,
          targetUserId,
          secretWord: secretWord.trim(),
          windowStart: new Date(windowStart).toISOString(),
          windowEnd: new Date(windowEnd).toISOString(),
        }),
      }) as { data: { market: { id: string } } }
      navigate(`/markets/${res.data.market.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create market')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
        New Market
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="target" className="mb-1 block text-sm font-medium text-text-secondary">Target Person</label>
          <select
            id="target"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-2 text-text-primary focus:border-accent-green focus:outline-none"
            required
          >
            <option value="">Select a person...</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="secret-word" className="mb-1 block text-sm font-medium text-text-secondary">Secret Word</label>
          <input
            id="secret-word"
            type="text"
            value={secretWord}
            onChange={(e) => setSecretWord(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-accent-green focus:outline-none"
            placeholder="e.g., synergy"
            required
          />
        </div>
        <div>
          <label htmlFor="window-start" className="mb-1 block text-sm font-medium text-text-secondary">Window Start</label>
          <input
            id="window-start"
            type="datetime-local"
            value={windowStart}
            onChange={(e) => setWindowStart(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-2 text-text-primary focus:border-accent-green focus:outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="window-end" className="mb-1 block text-sm font-medium text-text-secondary">Window End</label>
          <input
            id="window-end"
            type="datetime-local"
            value={windowEnd}
            onChange={(e) => setWindowEnd(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-2 text-text-primary focus:border-accent-green focus:outline-none"
            required
          />
        </div>
        {error && <p className="text-sm text-accent-red">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent-green px-4 py-2 font-semibold text-white transition-colors hover:bg-accent-green/90 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Market'}
        </button>
      </form>
    </div>
  )
}
