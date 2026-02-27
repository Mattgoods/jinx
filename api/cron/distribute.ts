import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  // Authenticate via CRON_SECRET
  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } })
  }

  try {
    const now = new Date()
    const currentDayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday

    // Get groups where today is distribution day
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, weekly_token_amount')
      .eq('token_distribution_day', currentDayOfWeek)

    if (groupsError) {
      console.error('Cron groups error:', groupsError)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch groups' } })
    }

    let distributed = 0

    // Get the start of the current ISO week (Monday)
    const weekStart = new Date(now)
    const day = weekStart.getDay()
    const diff = day === 0 ? -6 : 1 - day
    weekStart.setDate(weekStart.getDate() + diff)
    weekStart.setHours(0, 0, 0, 0)

    for (const group of (groups || [])) {
      // Get all members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', group.id)

      for (const member of (members || [])) {
        // Check if already distributed this week
        const { data: existing } = await supabase
          .from('token_distributions')
          .select('id')
          .eq('group_id', group.id)
          .eq('user_id', member.user_id)
          .gte('distributed_at', weekStart.toISOString())
          .single()

        if (existing) continue

        // Distribute tokens
        await supabase
          .from('token_distributions')
          .insert({
            group_id: group.id,
            user_id: member.user_id,
            amount: group.weekly_token_amount,
          })

        await supabase.rpc('increment_balance', {
          p_user_id: member.user_id,
          p_group_id: group.id,
          p_amount: group.weekly_token_amount,
        })

        distributed++
      }
    }

    return res.status(200).json({ data: { distributed } })
  } catch (err) {
    console.error('Cron distribute error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
