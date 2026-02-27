/**
 * Client-side form validation helpers.
 * Returns error messages or null if valid.
 */

/** Validate a non-empty string with length limits. */
export function validateRequired(value: string, fieldName: string, maxLength = 500): string | null {
  if (!value.trim()) {
    return `${fieldName} is required`
  }
  if (value.trim().length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters`
  }
  return null
}

/** Validate a positive integer amount. */
export function validateAmount(value: number, fieldName: string, max?: number): string | null {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return `${fieldName} must be a whole number`
  }
  if (value < 1) {
    return `${fieldName} must be at least 1`
  }
  if (max !== undefined && value > max) {
    return `${fieldName} cannot exceed ${max.toLocaleString()}`
  }
  return null
}

/** Validate that a date is in the future. */
export function validateFutureDate(value: string, fieldName: string): string | null {
  if (!value) {
    return `${fieldName} is required`
  }
  const d = new Date(value)
  if (isNaN(d.getTime())) {
    return `${fieldName} is not a valid date`
  }
  if (d <= new Date()) {
    return `${fieldName} must be in the future`
  }
  return null
}

/** Validate that end date is after start date. */
export function validateDateRange(start: string, end: string): string | null {
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null
  if (e <= s) {
    return 'End time must be after start time'
  }
  return null
}

/** Validate invite code format (alphanumeric). */
export function validateInviteCode(value: string): string | null {
  if (!value.trim()) {
    return 'Invite code is required'
  }
  if (!/^[A-Za-z0-9]+$/.test(value.trim())) {
    return 'Invite code must be alphanumeric'
  }
  return null
}
