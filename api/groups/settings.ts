import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.js'
import { supabase } from '../_lib/supabase.js'
import { isUUID } from '../_lib/validation.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = await verifyAuth(req)

    const groupId = req.query.groupId as string || req.body?.groupId as string
    if (!groupId || !isUUID(groupId)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'groupId must be a valid UUID' } })
    }

    // Verify the user is admin of this specific group
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .eq('admin_user_id', auth.userId)
      .single()

    if (!group) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not the admin of this group' } })
    }

    if (req.method === 'GET') {
      // Get members
      const { data: members } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          token_balance,
          users (display_name, avatar_url)
        `)
        .eq('group_id', group.id)

      const formattedMembers = (members || []).map((m) => ({
        id: m.id,
        user_id: m.user_id,
        display_name: (m.users as unknown as { display_name: string })?.display_name || 'Unknown',
        avatar_url: (m.users as unknown as { avatar_url: string | null })?.avatar_url || null,
        token_balance: m.token_balance,
      }))

      return res.status(200).json({ data: { group: { ...group, members: formattedMembers } } })
    }

    if (req.method === 'PUT') {
      const { name, weeklyTokenAmount, tokenDistributionDay } = req.body
      const updates: Record<string, unknown> = {}

      if (name !== undefined) {
        if (typeof name !== 'string' || !name.trim()) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid group name' } })
        }
        if (name.trim().length > 100) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Group name must be at most 100 characters' } })
        }
        updates.name = name.trim()
      }

      if (weeklyTokenAmount !== undefined) {
        if (!Number.isInteger(weeklyTokenAmount) || weeklyTokenAmount < 1 || weeklyTokenAmount > 1_000_000) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Weekly token amount must be an integer between 1 and 1,000,000' } })
        }
        updates.weekly_token_amount = weeklyTokenAmount
      }

      if (tokenDistributionDay !== undefined) {
        if (!Number.isInteger(tokenDistributionDay) || tokenDistributionDay < 0 || tokenDistributionDay > 6) {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Distribution day must be 0-6' } })
        }
        updates.token_distribution_day = tokenDistributionDay
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'No fields to update' } })
      }

      const { data: updated, error: updateError } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', group.id)
        .select()
        .single()

      if (updateError) {
        console.error('Group settings update error:', updateError)
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update settings' } })
      }

      return res.status(200).json({ data: { group: updated } })
    }

    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'GET or PUT only' } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Group settings error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
