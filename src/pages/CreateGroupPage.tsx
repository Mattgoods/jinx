import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { validateRequired } from '../lib/validation.ts'
import { Button, FormField, PageHeader, useToast } from '../components/ui'

export function CreateGroupPage() {
  const api = useApiClient()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validateRequired(name, 'Group name', 100)
    if (validationError) {
      setNameError(validationError)
      return
    }
    setNameError('')
    setSubmitting(true)
    setError('')
    try {
      await api('/groups/create', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      })
      addToast('Group created!')
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Create Group" backTo="/dashboard" backLabel="Dashboard" />
      <div className="rounded-2xl border border-border bg-bg-surface p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-green/10">
            <svg className="h-5 w-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">Create a new prediction group and invite your friends.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField
            label="Group Name"
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Prediction Group"
            maxLength={100}
            error={nameError}
            required
          />
          {error && <p className="text-sm text-accent-red">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full" size="lg">
            {submitting ? 'Creating...' : 'Create Group'}
          </Button>
        </form>
      </div>
    </div>
  )
}
