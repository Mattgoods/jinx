import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '@clerk/backend'
import { supabase } from '../_lib/supabase.ts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' } })
    }

    const token = authHeader.replace('Bearer ', '')
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })

    const clerkId = payload.sub
    const { displayName, avatarUrl } = req.body

    const { data: user, error } = await supabase
      .from('users')
      .upsert(
        {
          clerk_id: clerkId,
          display_name: displayName || 'Anonymous',
          avatar_url: avatarUrl || null,
        },
        { onConflict: 'clerk_id' },
      )
      .select()
      .single()

    if (error) {
      console.error('User sync error:', error)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to sync user' } })
    }

    return res.status(200).json({ data: { user } })
  } catch (err) {
    console.error('User sync error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
