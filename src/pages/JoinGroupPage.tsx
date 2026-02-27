import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { validateInviteCode } from '../lib/validation.ts'
import { Button, FormField, PageHeader, useToast } from '../components/ui'

export function JoinGroupPage() {
  const api = useApiClient()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validateInviteCode(inviteCode)
    if (validationError) {
      setCodeError(validationError)
      return
    }
    setCodeError('')
    setSubmitting(true)
    setError('')
    try {
      await api('/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })
      addToast('Joined group!')
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <PageHeader title="Join Group" backTo="/dashboard" backLabel="Dashboard" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Invite Code"
          id="invite-code"
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="ABC12345"
          mono
          error={codeError}
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
