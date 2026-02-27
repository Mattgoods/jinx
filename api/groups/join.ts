import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.ts'
import { supabase } from '../_lib/supabase.ts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const { inviteCode } = req.body

    if (!inviteCode || typeof inviteCode !== 'string') {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invite code is required' } })
    }

    // Look up group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.trim())
      .single()

    if (groupError || !group) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invalid invite code' } })
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', auth.userId)
      .single()

    if (existing) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'You are already a member of this group' } })
    }

    // Add member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: auth.userId,
        token_balance: 0,
      })

    if (memberError) {
      console.error('Join group error:', memberError)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to join group' } })
    }

    return res.status(200).json({ data: { group } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Join group error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
