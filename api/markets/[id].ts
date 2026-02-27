import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.ts'
import { supabase } from '../_lib/supabase.ts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const marketId = req.query.id as string

    if (!marketId) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Market ID is required' } })
    }

    // Get market with creator and target names
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select(`
        *,
        creator:users!markets_creator_id_fkey (display_name),
        target:users!markets_target_user_id_fkey (display_name)
      `)
      .eq('id', marketId)
      .single()

    if (marketError || !market) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Market not found' } })
    }

    // Verify group membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('group_id', market.group_id)
      .single()

    if (!membership) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a member of this group' } })
    }

    // Lazy transition
    if (market.status === 'active' && new Date(market.window_end) < new Date()) {
      await supabase
        .from('markets')
        .update({ status: 'pending_resolution' })
        .eq('id', marketId)
      market.status = 'pending_resolution'
    }

    // Get bets with user names
    const { data: bets } = await supabase
      .from('bets')
      .select(`
        id,
        user_id,
        side,
        amount,
        payout,
        created_at,
        users (display_name)
      `)
      .eq('market_id', marketId)
      .order('created_at', { ascending: true })

    const formattedBets = (bets || []).map((bet) => ({
      id: bet.id,
      user_id: bet.user_id,
      side: bet.side,
      amount: bet.amount,
      payout: bet.payout,
      display_name: (bet.users as unknown as { display_name: string })?.display_name || 'Unknown',
    }))

    // Redact secret word for target
    const isTarget = market.target_user_id === auth.userId
    const isResolved = market.status.startsWith('resolved')

    const response = {
      market: {
        ...market,
        secret_word: isTarget && !isResolved ? null : market.secret_word,
        creator_display_name: (market.creator as { display_name: string })?.display_name,
        target_display_name: (market.target as { display_name: string })?.display_name,
      },
      bets: formattedBets,
      isTarget,
    }

    return res.status(200).json({ data: response })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Market detail error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
