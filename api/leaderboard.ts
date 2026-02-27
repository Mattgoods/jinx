import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from './_lib/auth.js'
import { supabase } from './_lib/supabase.js'
import { isUUID } from './_lib/validation.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const groupId = req.query.groupId as string

    if (!groupId || !isUUID(groupId)) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'groupId must be a valid UUID' } })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('group_id', groupId)
      .single()

    if (!membership) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a member of this group' } })
    }

    // Get all members
    const { data: members } = await supabase
      .from('group_members')
      .select(`
        user_id,
        users (display_name, avatar_url)
      `)
      .eq('group_id', groupId)

    // Get all resolved bets in this group's markets
    const { data: markets } = await supabase
      .from('markets')
      .select('id')
      .eq('group_id', groupId)
      .in('status', ['resolved_yes', 'resolved_no'])

    const marketIds = (markets || []).map((m) => m.id)

    let allBets: Array<{ user_id: string; amount: number; payout: number | null }> = []
    if (marketIds.length > 0) {
      const { data: bets } = await supabase
        .from('bets')
        .select('user_id, amount, payout')
        .in('market_id', marketIds)
        .not('payout', 'is', null)

      allBets = bets || []
    }

    // Compute stats per member
    const leaderboard = (members || []).map((member) => {
      const userBets = allBets.filter((b) => b.user_id === member.user_id)
      const profitLoss = userBets.reduce((sum, b) => sum + ((b.payout || 0) - b.amount), 0)
      const wins = userBets.filter((b) => (b.payout || 0) > b.amount).length
      const winRate = userBets.length > 0 ? wins / userBets.length : 0

      return {
        userId: member.user_id,
        displayName: (member.users as unknown as { display_name: string })?.display_name || 'Unknown',
        avatarUrl: (member.users as unknown as { avatar_url: string | null })?.avatar_url || null,
        profitLoss,
        totalBets: userBets.length,
        winRate,
        rank: 0,
      }
    })

    // Sort by P/L descending
    leaderboard.sort((a, b) => b.profitLoss - a.profitLoss)
    leaderboard.forEach((entry, i) => { entry.rank = i + 1 })

    return res.status(200).json({ data: { leaderboard } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Leaderboard error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
