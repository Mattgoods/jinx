import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.js'
import { supabase } from '../_lib/supabase.js'
import { validateUUID, validateEnum, firstError } from '../_lib/validation.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const { marketId, outcome } = req.body

    const validationError = firstError(
      validateUUID(marketId, 'marketId'),
      validateEnum(outcome, 'outcome', ['yes', 'no'] as const),
    )
    if (validationError) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: validationError } })
    }

    // Get market for auth check (target-only)
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single()

    if (marketError || !market) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Market not found' } })
    }

    // Only the target can resolve (they know whether they said the word)
    if (market.target_user_id !== auth.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the market target can resolve this market' } })
    }

    // Call the atomic resolve_market RPC — handles status validation,
    // window check, payout calculation, and balance credits in one transaction
    const { error: rpcError } = await supabase.rpc('resolve_market', {
      p_market_id: marketId,
      p_outcome: outcome,
    })

    if (rpcError) {
      // Map RPC exceptions to appropriate HTTP responses
      const msg = rpcError.message
      if (msg.includes('not found')) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Market not found' } })
      }
      if (msg.includes('not resolvable')) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Market is not resolvable' } })
      }
      if (msg.includes('time window')) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Cannot resolve before the time window closes' } })
      }
      console.error('resolve_market RPC error:', rpcError)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
    }

    // Fetch the updated market to return to the client
    const newStatus = outcome === 'yes' ? 'resolved_yes' : 'resolved_no'
    return res.status(200).json({ data: { market: { ...market, status: newStatus } } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Market resolve error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
