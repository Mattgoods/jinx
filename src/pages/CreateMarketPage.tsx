import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useApiClient } from '../lib/api.ts'
import { validateRequired, validateFutureDate, validateDateRange } from '../lib/validation.ts'
import { Button, FormField, PageHeader, useToast } from '../components/ui'

interface GroupMember {
  user_id: string
  display_name: string
}

export function CreateMarketPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const api = useApiClient()
  const navigate = useNavigate()
  const { user } = useUser()
  const { addToast } = useToast()
  const [members, setMembers] = useState<GroupMember[]>([])
  const [targetUserId, setTargetUserId] = useState('')
  const [secretWord, setSecretWord] = useState('')
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(true)

  useEffect(() => {
    if (!groupId) return
    setLoadingMembers(true)
    api(`/groups/detail?groupId=${groupId}`)
      .then((res: { data: { group: { members: GroupMember[] } } }) => {
        setMembers(res.data.group.members || [])
      })
      .catch((err: unknown) => {
        console.error('Failed to load group members:', err)
        setError(err instanceof Error ? err.message : 'Failed to load group members')
      })
      .finally(() => setLoadingMembers(false))
  }, [api, groupId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!targetUserId) {
      errors.target = 'Please select a target person'
    } else if (user && members.find((m) => m.user_id === targetUserId && m.user_id === user.id)) {
      errors.target = 'You cannot target yourself'
    }

    const wordError = validateRequired(secretWord, 'Secret word', 50)
    if (wordError) errors.secretWord = wordError

    const startError = validateFutureDate(windowStart, 'Start time')
    if (startError) errors.windowStart = startError

    const endError = windowEnd ? validateFutureDate(windowEnd, 'End time') : 'End time is required'
    if (endError) errors.windowEnd = endError

    if (!startError && !endError) {
      const rangeError = validateDateRange(windowStart, windowEnd)
      if (rangeError) errors.windowEnd = rangeError
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

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
      addToast('Market created!')
      navigate(`/markets/${res.data.market.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create market')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <PageHeader title="New Market" backTo={`/group/${groupId}`} backLabel="Group" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          as="select"
          label="Target Person"
          id="target"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          error={fieldErrors.target}
          required
        >
          <option value="">{loadingMembers ? 'Loading members...' : 'Select a person...'}</option>
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
          maxLength={50}
          error={fieldErrors.secretWord}
          required
        />
        <FormField
          label="Window Start"
          id="window-start"
          type="datetime-local"
          value={windowStart}
          onChange={(e) => setWindowStart(e.target.value)}
          error={fieldErrors.windowStart}
          required
        />
        <FormField
          label="Window End"
          id="window-end"
          type="datetime-local"
          value={windowEnd}
          onChange={(e) => setWindowEnd(e.target.value)}
          error={fieldErrors.windowEnd}
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
