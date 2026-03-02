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
    <div className="mx-auto max-w-md">
      <PageHeader title="Join Group" backTo="/dashboard" backLabel="Dashboard" />
      <div className="rounded-2xl border border-border bg-bg-surface p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/10">
            <svg className="h-5 w-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">Enter an invite code to join an existing group.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
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
          <Button type="submit" disabled={submitting} className="w-full" size="lg">
            {submitting ? 'Joining...' : 'Join Group'}
          </Button>
        </form>
      </div>
    </div>
  )
}
