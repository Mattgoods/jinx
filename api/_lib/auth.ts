import { verifyToken } from '@clerk/backend'
import { supabase } from './supabase.js'
import { requireEnvVars } from './validation.js'
import type { VercelRequest } from '@vercel/node'

// Fail fast if CLERK_SECRET_KEY is missing
requireEnvVars('CLERK_SECRET_KEY')

export interface AuthContext {
  clerkId: string
  userId: string
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function verifyAuth(req: VercelRequest): Promise<AuthContext> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing authorization header')
  }

  const token = authHeader.replace('Bearer ', '')

  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY!,
  })

  const clerkId = payload.sub

  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()

  if (error || !user) {
    throw new AuthError('User not found in database')
  }

  return { clerkId, userId: user.id }
}

export async function requireGroupMember(
  userId: string,
  groupId: string,
): Promise<{ id: string; token_balance: number }> {
  const { data: membership, error } = await supabase
    .from('group_members')
    .select('id, token_balance')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single()

  if (error || !membership) {
    throw new AuthError('Not a member of this group')
  }

  return membership
}

export async function requireGroupAdmin(
  userId: string,
  groupId: string,
): Promise<void> {
  const { data: group, error } = await supabase
    .from('groups')
    .select('admin_user_id')
    .eq('id', groupId)
    .single()

  if (error || !group) {
    throw new AuthError('Group not found')
  }

  if (group.admin_user_id !== userId) {
    throw new AuthError('Not the group admin')
  }
}

export function errorResponse(err: unknown, status = 500) {
  if (err instanceof AuthError) {
    return new Response(
      JSON.stringify({ error: { code: 'UNAUTHORIZED', message: err.message } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }
  const message = err instanceof Error ? err.message : 'Internal server error'
  return new Response(
    JSON.stringify({ error: { code: 'INTERNAL_ERROR', message } }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ data }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

export function badRequest(message: string) {
  return new Response(
    JSON.stringify({ error: { code: 'BAD_REQUEST', message } }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  )
}

export function forbidden(message: string) {
  return new Response(
    JSON.stringify({ error: { code: 'FORBIDDEN', message } }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  )
}

export function notFound(message: string) {
  return new Response(
    JSON.stringify({ error: { code: 'NOT_FOUND', message } }),
    { status: 404, headers: { 'Content-Type': 'application/json' } },
  )
}
