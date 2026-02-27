import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { Button, FormField, PageHeader } from '../components/ui'

export function CreateGroupPage() {
  const api = useApiClient()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await api('/groups/create', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <PageHeader title="Create Group" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Group Name"
          id="group-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Prediction Group"
          required
        />
        {error && <p className="text-sm text-accent-red">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Creating...' : 'Create Group'}
        </Button>
      </form>
    </div>
  )
}
