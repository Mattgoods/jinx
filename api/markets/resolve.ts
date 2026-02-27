import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth'
import { supabase } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const { marketId, outcome } = req.body

    if (!marketId || !outcome || !['yes', 'no'].includes(outcome)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'marketId and outcome (yes/no) are required' } })
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

    // Only creator can resolve
    if (market.creator_id !== auth.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the creator can resolve this market' } })
    }

    // Market must be active or pending_resolution
    if (!['active', 'pending_resolution'].includes(market.status)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Market is not resolvable' } })
    }

    // Window must have closed
    if (new Date(market.window_end) > new Date()) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Cannot resolve before the time window closes' } })
    }

    // Get all bets
    const { data: bets } = await supabase
      .from('bets')
      .select('*')
      .eq('market_id', marketId)

    const allBets = bets || []

    // Calculate payouts
    const winningPool = outcome === 'yes' ? market.yes_pool : market.no_pool
    const totalPool = market.total_pool

    const payouts: Array<{ betId: string; userId: string; payout: number }> = []

    for (const bet of allBets) {
      let payout = 0
      if (bet.side === outcome && winningPool > 0) {
        payout = Math.floor((bet.amount / winningPool) * totalPool)
      }
      payouts.push({ betId: bet.id, userId: bet.user_id, payout })
    }

    // Update market status
    const newStatus = outcome === 'yes' ? 'resolved_yes' : 'resolved_no'
    await supabase
      .from('markets')
      .update({ status: newStatus, resolved_at: new Date().toISOString() })
      .eq('id', marketId)

    // Update each bet's payout and credit winners
    for (const p of payouts) {
      await supabase
        .from('bets')
        .update({ payout: p.payout })
        .eq('id', p.betId)

      if (p.payout > 0) {
        await supabase.rpc('increment_balance', {
          p_user_id: p.userId,
          p_group_id: market.group_id,
          p_amount: p.payout,
        })
      }
    }

    return res.status(200).json({ data: { market: { ...market, status: newStatus }, payouts } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Market resolve error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
