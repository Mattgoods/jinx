import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.js'
import { supabase } from '../_lib/supabase.js'
import { isUUID } from '../_lib/validation.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const groupId = req.query.id as string

    if (!groupId || !isUUID(groupId)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Group ID must be a valid UUID' } })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('group_id', groupId)
      .single()

    if (!membership) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a member of this group' } })
    }

    // Get group details
    const { data: group } = await supabase
      .from('groups')
      .select('id, name, invite_code, admin_user_id, weekly_token_amount, token_distribution_day')
      .eq('id', groupId)
      .single()

    if (!group) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Group not found' } })
    }

    // Get members
    const { data: members } = await supabase
      .from('group_members')
      .select(`
        id,
        user_id,
        token_balance,
        users (display_name, avatar_url)
      `)
      .eq('group_id', groupId)

    const formattedMembers = (members || []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      display_name: (m.users as unknown as { display_name: string })?.display_name || 'Unknown',
      avatar_url: (m.users as unknown as { avatar_url: string | null })?.avatar_url || null,
      token_balance: m.token_balance,
    }))

    return res.status(200).json({
      data: {
        group: {
          ...group,
          isAdmin: group.admin_user_id === auth.userId,
          members: formattedMembers,
        },
      },
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Group detail error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
