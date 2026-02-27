import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '@clerk/backend'
import { verifyAuth, AuthError } from '../_lib/auth'
import { supabase } from '../_lib/supabase'
import { validateString } from '../_lib/validation'

async function handleProfile(req: VercelRequest, res: VercelResponse) {
  const auth = await verifyAuth(req)

  const { data: user } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .eq('id', auth.userId)
    .single()

  const { data: memberships } = await supabase
    .from('group_members')
    .select(`
      group_id,
      token_balance,
      groups (name)
    `)
    .eq('user_id', auth.userId)

  const formattedMemberships = (memberships || []).map((m) => ({
    group_id: m.group_id,
    group_name: (m.groups as unknown as { name: string })?.name || '',
    token_balance: m.token_balance,
  }))

  const { data: bets } = await supabase
    .from('bets')
    .select(`
      id,
      side,
      amount,
      payout,
      markets (
        target_user_id,
        secret_word,
        status,
        users!markets_target_user_id_fkey (display_name)
      )
    `)
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  const betHistory = (bets || []).map((bet) => {
    const market = bet.markets as unknown as {
      target_user_id: string
      secret_word: string
      status: string
      users: { display_name: string }
    }
    const isTarget = market?.target_user_id === auth.userId
    const isResolved = market?.status?.startsWith('resolved')
    return {
      id: bet.id,
      market_target: market?.users?.display_name || 'Unknown',
      secret_word: isTarget && !isResolved ? null : market?.secret_word,
      side: bet.side,
      amount: bet.amount,
      payout: bet.payout,
      status: market?.status,
    }
  })

  const resolvedBets = betHistory.filter((b) => b.payout !== null)
  const lifetimePL = resolvedBets.reduce((sum, b) => sum + ((b.payout || 0) - b.amount), 0)
  const wins = resolvedBets.filter((b) => (b.payout || 0) > b.amount).length
  const winRate = resolvedBets.length > 0 ? wins / resolvedBets.length : 0

  return res.status(200).json({
    data: {
      user,
      memberships: formattedMemberships,
      betHistory,
      stats: { lifetimePL, totalBets: resolvedBets.length, winRate },
    },
  })
}

async function handleSync(req: VercelRequest, res: VercelResponse) {
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

  // Validate displayName if provided
  const safeName = typeof displayName === 'string' && displayName.trim() ? displayName.trim().slice(0, 100) : 'Anonymous'

  // Validate avatarUrl if provided
  let safeAvatarUrl: string | null = null
  if (avatarUrl && typeof avatarUrl === 'string') {
    const urlError = validateString(avatarUrl, 'avatarUrl', { maxLength: 2000 })
    if (!urlError) {
      safeAvatarUrl = avatarUrl
    }
  }

  const { data: user, error } = await supabase
    .from('users')
    .upsert(
      {
        clerk_id: clerkId,
        display_name: safeName,
        avatar_url: safeAvatarUrl,
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
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const action = req.query.action as string

    if (action === 'sync') {
      return await handleSync(req, res)
    }

    if (action === 'profile') {
      return await handleProfile(req, res)
    }

    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid action' } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('User handler error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
