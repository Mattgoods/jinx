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

    // Get market for auth check (creator-only)
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

    // Call the atomic cancel_market RPC — handles status validation,
    // bet refunds, and balance credits in one transaction
    const { error: rpcError } = await supabase.rpc('cancel_market', {
      p_market_id: marketId,
    })

    if (rpcError) {
      // Map RPC exceptions to appropriate HTTP responses
      const msg = rpcError.message
      if (msg.includes('not found')) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Market not found' } })
      }
      if (msg.includes('resolved')) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Cannot cancel a resolved market' } })
      }
      if (msg.includes('already cancelled')) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Market is already cancelled' } })
      }
      console.error('cancel_market RPC error:', rpcError)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
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
