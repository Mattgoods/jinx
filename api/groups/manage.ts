import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAuth, AuthError } from '../_lib/auth.js'
import { supabase } from '../_lib/supabase.js'
import { validateString, validateUUID, firstError } from '../_lib/validation.js'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  const auth = await verifyAuth(req)
  const { name } = req.body

  const nameError = validateString(name, 'Group name', { maxLength: 100 })
  if (nameError) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: nameError } })
  }

  let inviteCode: string
  let attempts = 0
  while (true) {
    inviteCode = generateInviteCode()
    const { data: existing } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', inviteCode)
      .single()
    if (!existing) break
    attempts++
    if (attempts > 10) {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate unique invite code' } })
    }
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: name.trim(),
      invite_code: inviteCode,
      admin_user_id: auth.userId,
    })
    .select()
    .single()

  if (groupError) {
    console.error('Group creation error:', groupError)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create group' } })
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: auth.userId,
      token_balance: 0,
    })

  if (memberError) {
    console.error('Member creation error:', memberError)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add creator as member' } })
  }

  return res.status(200).json({ data: { group } })
}

async function handleJoin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  const auth = await verifyAuth(req)
  const { inviteCode } = req.body

  if (!inviteCode || typeof inviteCode !== 'string' || !/^[A-Za-z0-9]{1,20}$/.test(inviteCode.trim())) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invite code must be alphanumeric' } })
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode.trim())
    .single()

  if (groupError || !group) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invalid invite code' } })
  }

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', auth.userId)
    .single()

  if (existing) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'You are already a member of this group' } })
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: auth.userId,
      token_balance: 0,
    })

  if (memberError) {
    console.error('Join group error:', memberError)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to join group' } })
  }

  return res.status(200).json({ data: { group } })
}

async function handleMembers(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'DELETE only' } })
  }

  const auth = await verifyAuth(req)
  const { userId, groupId } = req.body

  const validationError = firstError(
    validateUUID(userId, 'userId'),
    validateUUID(groupId, 'groupId'),
  )
  if (validationError) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: validationError } })
  }

  const { data: group } = await supabase
    .from('groups')
    .select('admin_user_id')
    .eq('id', groupId)
    .single()

  if (!group || group.admin_user_id !== auth.userId) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not the group admin' } })
  }

  if (userId === auth.userId) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Cannot remove yourself as admin' } })
  }

  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (deleteError) {
    console.error('Remove member error:', deleteError)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' } })
  }

  return res.status(200).json({ data: { removed: true } })
}

async function handleRegenerateInvite(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'POST only' } })
  }

  const auth = await verifyAuth(req)

  const { groupId } = req.body
  const groupIdError = validateUUID(groupId, 'groupId')
  if (groupIdError) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: groupIdError } })
  }

  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('admin_user_id', auth.userId)
    .single()

  if (!group) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not the admin of this group' } })
  }

  let inviteCode: string
  let attempts = 0
  while (true) {
    inviteCode = generateInviteCode()
    const { data: existing } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', inviteCode)
      .single()
    if (!existing) break
    attempts++
    if (attempts > 10) {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate unique invite code' } })
    }
  }

  const { error: updateError } = await supabase
    .from('groups')
    .update({ invite_code: inviteCode })
    .eq('id', group.id)

  if (updateError) {
    console.error('Regenerate invite error:', updateError)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to regenerate invite code' } })
  }

  return res.status(200).json({ data: { inviteCode } })
}

const actions: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void>> = {
  create: handleCreate,
  join: handleJoin,
  members: handleMembers,
  'regenerate-invite': handleRegenerateInvite,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const action = req.query.action as string
    const actionHandler = actions[action]

    if (!actionHandler) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid action' } })
    }

    return await actionHandler(req, res)
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: err.message } })
    }
    console.error('Group manage error:', err)
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
  }
}
