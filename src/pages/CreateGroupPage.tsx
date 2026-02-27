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
          maxLength={100}
          error={nameError}
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
