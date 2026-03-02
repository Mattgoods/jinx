import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
import { validateRequired, validateAmount } from '../lib/validation.ts'
import { Button, Card, FormField, Avatar, LoadingState, PageHeader, useToast } from '../components/ui'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface GroupSettings {
  id: string
  name: string
  invite_code: string
  weekly_token_amount: number
  token_distribution_day: number
  members: Array<{ id: string; user_id: string; display_name: string; avatar_url: string | null; token_balance: number }>
}

export function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const api = useApiClient()
  const { addToast } = useToast()
  const [settings, setSettings] = useState<GroupSettings | null>(null)
  const [name, setName] = useState('')
  const [weeklyTokenAmount, setWeeklyTokenAmount] = useState(1000)
  const [distributionDay, setDistributionDay] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [accessDenied, setAccessDenied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    api(`/groups/settings?groupId=${groupId}`)
      .then((res: { data: { group: GroupSettings } }) => {
        const g = res.data.group
        setSettings(g)
        setName(g.name)
        setWeeklyTokenAmount(g.weekly_token_amount)
        setDistributionDay(g.token_distribution_day)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load settings'
        if (message.toLowerCase().includes('not the admin') || message.toLowerCase().includes('forbidden')) {
          setAccessDenied(true)
        } else {
          setError(message)
        }
      })
      .finally(() => setLoading(false))
  }, [api, groupId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}

    const nameError = validateRequired(name, 'Group name', 100)
    if (nameError) errors.name = nameError

    const tokenError = validateAmount(weeklyTokenAmount, 'Weekly token amount', 1_000_000)
    if (tokenError) errors.weeklyTokenAmount = tokenError

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await api(`/groups/settings?groupId=${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          weeklyTokenAmount,
          tokenDistributionDay: distributionDay,
        }),
      }) as { data: { group: GroupSettings } }
      setSettings(res.data.group)
      setSuccess('Settings saved.')
      addToast('Settings saved!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerateInvite() {
    try {
      const res = await api('/groups/regenerate-invite', {
        method: 'POST',
        body: JSON.stringify({ groupId }),
      }) as { data: { inviteCode: string } }
      if (settings) {
        setSettings({ ...settings, invite_code: res.data.inviteCode })
      }
      addToast('Invite code regenerated!', 'info')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate invite code')
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      await api('/groups/members', {
        method: 'DELETE',
        body: JSON.stringify({ userId, groupId }),
      })
      if (settings) {
        setSettings({
          ...settings,
          members: settings.members.filter((m) => m.user_id !== userId),
        })
      }
      addToast('Member removed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title="Group Settings" backTo={`/group/${groupId}`} backLabel="Group" />
        <Card className="py-8 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-text-secondary">Only the group administrator can access settings.</p>
        </Card>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title="Group Settings" backTo={`/group/${groupId}`} backLabel="Group" />
        <Card className="py-8 text-center">
          <p className="text-accent-red">{error || 'Failed to load settings.'}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Group Settings" backTo={`/group/${groupId}`} backLabel="Group" />

      <div className="rounded-2xl border border-border bg-bg-surface p-6 mb-6">
        <form onSubmit={handleSave} className="space-y-5">
          <FormField
            label="Group Name"
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            error={fieldErrors.name}
            required
          />
          <FormField
            label="Weekly Token Amount"
            id="weekly-tokens"
            type="number"
            min={1}
            max={1000000}
            value={weeklyTokenAmount}
            onChange={(e) => setWeeklyTokenAmount(Number(e.target.value))}
            mono
            error={fieldErrors.weeklyTokenAmount}
          />
          <FormField as="select" label="Distribution Day" id="distribution-day" value={distributionDay} onChange={(e) => setDistributionDay(Number(e.target.value))}>
            {DAYS.map((day, i) => (
              <option key={i} value={i}>{day}</option>
            ))}
          </FormField>
          {error && <p className="text-sm text-accent-red">{error}</p>}
          {success && <p className="text-sm text-accent-green">{success}</p>}
          <Button type="submit" disabled={saving} className="w-full" size="lg">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </div>

      <Card className="mb-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-secondary">
          <svg className="h-4 w-4 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Invite Code
        </h3>
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-bg-primary px-4 py-2 font-mono text-lg font-semibold text-accent-amber">{settings.invite_code}</span>
          <Button variant="ghost" size="sm" onClick={handleRegenerateInvite}>
            Regenerate
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-secondary">
          <svg className="h-4 w-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Members ({settings.members.length})
        </h3>
        <div className="space-y-2">
          {settings.members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between rounded-xl border border-border bg-bg-surface px-4 py-3 transition-colors hover:bg-bg-hover">
              <div className="flex items-center gap-3">
                <Avatar src={member.avatar_url} name={member.display_name} size="sm" />
                <span className="text-text-primary font-medium">{member.display_name}</span>
              </div>
              <button
                onClick={() => handleRemoveMember(member.user_id)}
                className="rounded-lg px-3 py-1 text-sm text-accent-red transition-colors hover:bg-accent-red/10"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
