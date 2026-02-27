/**
 * Shared input validation utilities for API endpoints.
 * Returns descriptive error messages for BAD_REQUEST responses.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Validate that a value is a UUID v4 string. */
export function isUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** Validate a required non-empty string with optional length constraints. */
export function validateString(
  value: unknown,
  fieldName: string,
  opts: { minLength?: number; maxLength?: number } = {},
): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return `${fieldName} is required`
  }
  const trimmed = value.trim()
  const min = opts.minLength ?? 1
  const max = opts.maxLength ?? 500
  if (trimmed.length < min) {
    return `${fieldName} must be at least ${min} character${min === 1 ? '' : 's'}`
  }
  if (trimmed.length > max) {
    return `${fieldName} must be at most ${max} characters`
  }
  return null
}

/** Validate a required UUID field. */
export function validateUUID(value: unknown, fieldName: string): string | null {
  if (!value || typeof value !== 'string') {
    return `${fieldName} is required`
  }
  if (!isUUID(value)) {
    return `${fieldName} must be a valid UUID`
  }
  return null
}

/** Validate a required positive integer with optional range. */
export function validatePositiveInt(
  value: unknown,
  fieldName: string,
  opts: { min?: number; max?: number } = {},
): string | null {
  if (value === undefined || value === null) {
    return `${fieldName} is required`
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return `${fieldName} must be an integer`
  }
  const min = opts.min ?? 1
  const max = opts.max ?? Number.MAX_SAFE_INTEGER
  if (value < min) {
    return `${fieldName} must be at least ${min}`
  }
  if (value > max) {
    return `${fieldName} must be at most ${max}`
  }
  return null
}

/** Validate a required ISO date string, returning the parsed Date. */
export function validateDate(value: unknown, fieldName: string): { date: Date; error: null } | { date: null; error: string } {
  if (!value || typeof value !== 'string') {
    return { date: null, error: `${fieldName} is required` }
  }
  const d = new Date(value)
  if (isNaN(d.getTime())) {
    return { date: null, error: `${fieldName} is not a valid date` }
  }
  return { date: d, error: null }
}

/** Validate that a value is one of the allowed enum values. */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowed: readonly T[],
): string | null {
  if (!value || typeof value !== 'string') {
    return `${fieldName} is required`
  }
  if (!allowed.includes(value as T)) {
    return `${fieldName} must be one of: ${allowed.join(', ')}`
  }
  return null
}

/** Collect validation errors from multiple checks. Returns the first error or null. */
export function firstError(...errors: Array<string | null>): string | null {
  for (const err of errors) {
    if (err) return err
  }
  return null
}

/**
 * Validate required environment variables at module load time.
 * Throws if any are missing so the serverless function fails fast.
 */
export function requireEnvVars(...names: string[]): void {
  const missing = names.filter((n) => !process.env[n])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Market status values accepted as query filters
export const MARKET_STATUSES = ['active', 'pending_resolution', 'resolved_yes', 'resolved_no', 'cancelled'] as const
export type MarketStatus = (typeof MARKET_STATUSES)[number]
