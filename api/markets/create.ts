import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.js'
import { supabase } from '../_lib/supabase.js'
import { validateUUID, validateString, validateDate, firstError } from '../_lib/validation.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  try {
    const auth = await verifyAuth(req)
    const { groupId, targetUserId, secretWord, windowStart, windowEnd } = req.body

    // Validate required fields
    const fieldError = firstError(
      validateUUID(groupId, 'groupId'),
      validateUUID(targetUserId, 'targetUserId'),
      validateString(secretWord, 'secretWord', { maxLength: 50 }),
    )
    if (fieldError) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: fieldError } })
    }

    const startResult = validateDate(windowStart, 'windowStart')
    if (startResult.error) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: startResult.error } })
    }
    const endResult = validateDate(windowEnd, 'windowEnd')
    if (endResult.error) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: endResult.error } })
    }

    if (targetUserId === auth.userId) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Cannot target yourself' } })
    }

    // Safe: validated above
    const start = startResult.date!
    const end = endResult.date!

    if (start <= new Date()) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Window start must be in the future' } })
    }

    if (end <= start) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Window end must be after start' } })
    }

    // Verify group membership for creator
    const { data: creatorMembership } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('group_id', groupId)
      .single()

    if (!creatorMembership) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a member of this group' } })
    }

    // Verify target is a group member
    const { data: targetMembership } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('group_id', groupId)
      .single()

    if (!targetMembership) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Target must be a group member' } })
    }

    // Create market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .insert({
        group_id: groupId,
        creator_id: auth.userId,
        target_user_id: targetUserId,
        secret_word: secretWord.trim(),
        window_start: start.toISOString(),
        window_end: end.toISOString(),
        status: 'active',
        total_pool: 0,
        yes_pool: 0,
        no_pool: 0,
      })
      .select()
      .single()

    if (marketError) {
      console.error('Market creation error:', marketError)
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create market' } })
    }

    return res.status(200).json({ data: { market } })
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Market create error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
