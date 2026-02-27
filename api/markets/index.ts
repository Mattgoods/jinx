import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.ts'
import { supabase } from '../_lib/supabase.ts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const groupId = req.query.groupId as string
    const status = req.query.status as string | undefined

    if (!groupId) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'groupId is required' } })
    }

    // Verify group membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('group_id', groupId)
      .single()

    if (!membership) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a member of this group' } })
    }

    // Lazy transition: update active markets where window has closed
    await supabase
      .from('markets')
      .update({ status: 'pending_resolution' })
      .eq('group_id', groupId)
      .eq('status', 'active')
      .lt('window_end', new Date().toISOString())

    // Build query
    let query = supabase
      .from('markets')
      .select(`
        *,
        creator:users!markets_creator_id_fkey (display_name),
        target:users!markets_target_user_id_fkey (display_name)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: markets, error: marketsError } = await query

    if (marketsError) {
      console.error('Markets list error:', marketsError)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch markets' } })
    }

    // Redact secret word for target user
    const redactedMarkets = (markets || []).map((market) => {
      const isTarget = market.target_user_id === auth.userId
      const isResolved = market.status.startsWith('resolved')
      return {
        ...market,
        secret_word: isTarget && !isResolved ? null : market.secret_word,
        creator_display_name: (market.creator as { display_name: string })?.display_name,
        target_display_name: (market.target as { display_name: string })?.display_name,
      }
    })

    return res.status(200).json({ data: { markets: redactedMarkets } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Markets list error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
