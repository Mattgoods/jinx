import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useApiClient } from '../lib/api.ts'
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

  useEffect(() => {
    api(`/groups/settings?groupId=${groupId}`)
      .then((res: { data: { group: GroupSettings } }) => {
        const g = res.data.group
        setSettings(g)
        setName(g.name)
        setWeeklyTokenAmount(g.weekly_token_amount)
        setDistributionDay(g.token_distribution_day)
      })
      .catch(console.error)
  }, [api, groupId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
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

  if (!settings) {
    return <LoadingState />
  }

  return (
    <div className="mx-auto max-w-lg py-6">
      <PageHeader title="Group Settings" />

      <form onSubmit={handleSave} className="mb-8 space-y-4">
        <FormField
          label="Group Name"
          id="group-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FormField
          label="Weekly Token Amount"
          id="weekly-tokens"
          type="number"
          min={1}
          value={weeklyTokenAmount}
          onChange={(e) => setWeeklyTokenAmount(Number(e.target.value))}
          mono
        />
        <FormField as="select" label="Distribution Day" id="distribution-day" value={distributionDay} onChange={(e) => setDistributionDay(Number(e.target.value))}>
          {DAYS.map((day, i) => (
            <option key={i} value={i}>{day}</option>
          ))}
        </FormField>
        {error && <p className="text-sm text-accent-red">{error}</p>}
        {success && <p className="text-sm text-accent-green">{success}</p>}
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>

      <Card className="mb-8">
        <h3 className="mb-2 text-sm font-medium text-text-secondary">Invite Code</h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-semibold text-accent-amber">{settings.invite_code}</span>
          <Button variant="ghost" size="sm" onClick={handleRegenerateInvite}>
            Regenerate
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-medium text-text-secondary">Members ({settings.members.length})</h3>
        <div className="space-y-2">
          {settings.members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar src={member.avatar_url} name={member.display_name} size="sm" />
                <span className="text-text-primary">{member.display_name}</span>
              </div>
              <button
                onClick={() => handleRemoveMember(member.user_id)}
                className="text-sm text-accent-red transition-colors hover:text-accent-red/80"
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
