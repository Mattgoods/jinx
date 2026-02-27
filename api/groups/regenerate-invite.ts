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

    const { groupId } = req.body
    if (!groupId) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'groupId is required' } })
    }

    // Verify the user is admin of this specific group
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .eq('admin_user_id', auth.userId)
      .single()

    if (!group) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not the admin of this group' } })
    }

    // Generate new unique code
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

    const { error: updateError } = await supabase
      .from('groups')
      .update({ invite_code: inviteCode })
      .eq('id', group.id)

    if (updateError) {
      console.error('Regenerate invite error:', updateError)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to regenerate invite code' } })
    }

    return res.status(200).json({ data: { inviteCode } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Regenerate invite error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
