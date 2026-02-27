import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'

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
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
        Join Group
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="invite-code" className="mb-1 block text-sm font-medium text-text-secondary">
            Invite Code
          </label>
          <input
            id="invite-code"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-2 font-mono text-text-primary placeholder-text-tertiary focus:border-accent-green focus:outline-none"
            placeholder="ABC12345"
            required
          />
        </div>
        {error && <p className="text-sm text-accent-red">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent-green px-4 py-2 font-semibold text-white transition-colors hover:bg-accent-green/90 disabled:opacity-50"
        >
          {submitting ? 'Joining...' : 'Join Group'}
        </button>
      </form>
    </div>
  )
}
