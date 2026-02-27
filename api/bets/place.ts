import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth'
import { supabase } from '../_lib/supabase'
import { validateUUID, validateEnum, validatePositiveInt, firstError } from '../_lib/validation'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const { marketId, side, amount } = req.body

    // Validate input
    const validationError = firstError(
      validateUUID(marketId, 'marketId'),
      validateEnum(side, 'side', ['yes', 'no'] as const),
      validatePositiveInt(amount, 'amount', { min: 1, max: 1_000_000 }),
    )
    if (validationError) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: validationError } })
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

    // Market must be active and window not closed
    if (market.status !== 'active' || new Date(market.window_end) <= new Date()) {
      return res.status(400).json({ error: { code: 'MARKET_NOT_BETTABLE', message: 'This market is not accepting bets' } })
    }

    // Cannot bet on market targeting yourself
    if (market.target_user_id === auth.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot bet on a market where you are the target' } })
    }

    // Check balance
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .select('id, token_balance')
      .eq('user_id', auth.userId)
      .eq('group_id', market.group_id)
      .single()

    if (memberError || !membership) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a member of this group' } })
    }

    if (membership.token_balance < amount) {
      return res.status(400).json({ error: { code: 'INSUFFICIENT_BALANCE', message: `Insufficient balance. You have ${membership.token_balance} tokens` } })
    }

    // Execute the bet atomically using RPC
    const { data: result, error: rpcError } = await supabase.rpc('place_bet', {
      p_market_id: marketId,
      p_user_id: auth.userId,
      p_group_id: market.group_id,
      p_side: side,
      p_amount: amount,
    })

    if (rpcError) {
      console.error('Place bet RPC error:', rpcError)
      // Fallback: do it with individual queries
      // Deduct balance
      await supabase
        .from('group_members')
        .update({ token_balance: membership.token_balance - amount })
        .eq('id', membership.id)

      // Insert bet
      const { data: bet } = await supabase
        .from('bets')
        .insert({
          market_id: marketId,
          user_id: auth.userId,
          side,
          amount,
        })
        .select()
        .single()

      // Update pool
      const poolUpdate: Record<string, number> = {
        total_pool: market.total_pool + amount,
      }
      if (side === 'yes') {
        poolUpdate.yes_pool = market.yes_pool + amount
      } else {
        poolUpdate.no_pool = market.no_pool + amount
      }
      await supabase
        .from('markets')
        .update(poolUpdate)
        .eq('id', marketId)

      const { data: updatedMarket } = await supabase
        .from('markets')
        .select('*')
        .eq('id', marketId)
        .single()

      return res.status(200).json({
        data: {
          bet,
          newBalance: membership.token_balance - amount,
          updatedMarket,
        },
      })
    }

    // If RPC succeeded
    const { data: updatedMarket } = await supabase
      .from('markets')
      .select('*')
      .eq('id', marketId)
      .single()

    return res.status(200).json({
      data: {
        bet: result,
        newBalance: membership.token_balance - amount,
        updatedMarket,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Place bet error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
