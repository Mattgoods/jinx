import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { Button, FormField, PageHeader } from '../components/ui'

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
      <PageHeader title="New Market" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          as="select"
          label="Target Person"
          id="target"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          required
        >
          <option value="">Select a person...</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
          ))}
        </FormField>
        <FormField
          label="Secret Word"
          id="secret-word"
          type="text"
          value={secretWord}
          onChange={(e) => setSecretWord(e.target.value)}
          placeholder="e.g., synergy"
          required
        />
        <FormField
          label="Window Start"
          id="window-start"
          type="datetime-local"
          value={windowStart}
          onChange={(e) => setWindowStart(e.target.value)}
          required
        />
        <FormField
          label="Window End"
          id="window-end"
          type="datetime-local"
          value={windowEnd}
          onChange={(e) => setWindowEnd(e.target.value)}
          required
        />
        {error && <p className="text-sm text-accent-red">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating...' : 'Create Market'}
        </Button>
      </form>
    </div>
  )
}
