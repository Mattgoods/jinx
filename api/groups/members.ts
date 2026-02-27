import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.ts'
import { supabase } from '../_lib/supabase.ts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'DELETE only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const { userId, groupId } = req.body

    if (!userId || !groupId) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'userId and groupId are required' } })
    }

    // Verify admin
    const { data: group } = await supabase
      .from('groups')
      .select('admin_user_id')
      .eq('id', groupId)
      .single()

    if (!group || group.admin_user_id !== auth.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not the group admin' } })
    }

    // Cannot remove yourself
    if (userId === auth.userId) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Cannot remove yourself as admin' } })
    }

    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Remove member error:', deleteError)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' } })
    }

    return res.status(200).json({ data: { removed: true } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Remove member error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
