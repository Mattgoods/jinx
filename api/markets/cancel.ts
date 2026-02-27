import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.js'
import { supabase } from '../_lib/supabase.js'
import { validateUUID } from '../_lib/validation.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const { marketId } = req.body

    const marketIdError = validateUUID(marketId, 'marketId')
    if (marketIdError) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: marketIdError } })
    }

    // Get market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single()

    if (marketError || !market) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Market not found' } })
    }

    // Only creator can cancel
    if (market.creator_id !== auth.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the creator can cancel this market' } })
    }

    // Cannot cancel resolved markets
    if (market.status.startsWith('resolved')) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Cannot cancel a resolved market' } })
    }

    // Get all bets to refund
    const { data: bets } = await supabase
      .from('bets')
      .select('*')
      .eq('market_id', marketId)

    // Update market status
    await supabase
      .from('markets')
      .update({ status: 'cancelled' })
      .eq('id', marketId)

    // Refund all bets
    for (const bet of (bets || [])) {
      // Set payout = amount (P/L = 0)
      await supabase
        .from('bets')
        .update({ payout: bet.amount })
        .eq('id', bet.id)

      // Refund tokens
      await supabase.rpc('increment_balance', {
        p_user_id: bet.user_id,
        p_group_id: market.group_id,
        p_amount: bet.amount,
      })
    }

    return res.status(200).json({ data: { market: { ...market, status: 'cancelled' } } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Market cancel error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
