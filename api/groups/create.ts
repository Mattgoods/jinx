import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.ts'
import { supabase } from '../_lib/supabase.ts'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const { name } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Group name is required' } })
    }

    // Generate unique invite code with retry
    let inviteCode: string
    let attempts = 0
    while (true) {
      inviteCode = generateInviteCode()
      const { data: existing } = await supabase
        .from('groups')
        .select('id')
        .eq('invite_code', inviteCode)
        .single()
      if (!existing) break
      attempts++
      if (attempts > 10) {
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate unique invite code' } })
      }
    }

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        invite_code: inviteCode,
        admin_user_id: auth.userId,
      })
      .select()
      .single()

    if (groupError) {
      console.error('Group creation error:', groupError)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create group' } })
    }

    // Add creator as member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: auth.userId,
        token_balance: 0,
      })

    if (memberError) {
      console.error('Member creation error:', memberError)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add creator as member' } })
    }

    return res.status(200).json({ data: { group } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Group create error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
