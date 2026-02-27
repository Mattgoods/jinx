import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { Button, FormField, PageHeader } from '../components/ui'

export function JoinGroupPage() {
  const api = useApiClient()
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await api('/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <PageHeader title="Join Group" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Invite Code"
          id="invite-code"
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="ABC12345"
          mono
          required
        />
        {error && <p className="text-sm text-accent-red">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Joining...' : 'Join Group'}
        </Button>
      </form>
    </div>
  )
}
