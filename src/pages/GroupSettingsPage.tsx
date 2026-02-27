import { useState, useEffect } from 'react'
import { useApiClient } from '../lib/api.ts'

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
  const api = useApiClient()
  const [settings, setSettings] = useState<GroupSettings | null>(null)
  const [name, setName] = useState('')
  const [weeklyTokenAmount, setWeeklyTokenAmount] = useState(1000)
  const [distributionDay, setDistributionDay] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api('/groups/settings')
      .then((res: { data: { group: GroupSettings } }) => {
        const g = res.data.group
        setSettings(g)
        setName(g.name)
        setWeeklyTokenAmount(g.weekly_token_amount)
        setDistributionDay(g.token_distribution_day)
      })
      .catch(console.error)
  }, [api])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await api('/groups/settings', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          weeklyTokenAmount,
          tokenDistributionDay: distributionDay,
        }),
      }) as { data: { group: GroupSettings } }
      setSettings(res.data.group)
      setSuccess('Settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerateInvite() {
    try {
      const res = await api('/groups/regenerate-invite', { method: 'POST' }) as { data: { inviteCode: string } }
      if (settings) {
        setSettings({ ...settings, invite_code: res.data.inviteCode })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate invite code')
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      await api('/groups/members', {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      })
      if (settings) {
        setSettings({
          ...settings,
          members: settings.members.filter((m) => m.user_id !== userId),
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  if (!settings) {
    return <div className="text-text-secondary">Loading...</div>
  }

  return (
    <div className="mx-auto max-w-lg py-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
        Group Settings
      </h1>

      <form onSubmit={handleSave} className="mb-8 space-y-4">
        <div>
          <label htmlFor="group-name" className="mb-1 block text-sm font-medium text-text-secondary">Group Name</label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-2 text-text-primary focus:border-accent-green focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="weekly-tokens" className="mb-1 block text-sm font-medium text-text-secondary">Weekly Token Amount</label>
          <input
            id="weekly-tokens"
            type="number"
            min="1"
            value={weeklyTokenAmount}
            onChange={(e) => setWeeklyTokenAmount(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-2 font-mono text-text-primary focus:border-accent-green focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="distribution-day" className="mb-1 block text-sm font-medium text-text-secondary">Distribution Day</label>
          <select
            id="distribution-day"
            value={distributionDay}
            onChange={(e) => setDistributionDay(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-bg-surface px-4 py-2 text-text-primary focus:border-accent-green focus:outline-none"
          >
            {DAYS.map((day, i) => (
              <option key={i} value={i}>{day}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-accent-red">{error}</p>}
        {success && <p className="text-sm text-accent-green">{success}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-accent-green px-4 py-2 font-semibold text-white transition-colors hover:bg-accent-green/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      <div className="mb-8 rounded-xl border border-border bg-bg-surface p-5">
        <h3 className="mb-2 text-sm font-medium text-text-secondary">Invite Code</h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-semibold text-accent-amber">{settings.invite_code}</span>
          <button
            onClick={handleRegenerateInvite}
            className="rounded-lg border border-border px-3 py-1 text-sm text-text-secondary transition-colors hover:bg-bg-hover"
          >
            Regenerate
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-text-secondary">Members ({settings.members.length})</h3>
        <div className="space-y-2">
          {settings.members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-3">
              <div className="flex items-center gap-3">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-hover text-sm text-text-secondary">
                    {member.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
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
