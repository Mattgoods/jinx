import { useState, useEffect } from 'react'

interface CountdownTimerProps {
  /** ISO date string for when the countdown ends */
  targetDate: string
  /** Optional label prefix, e.g. "Ends in" or "Starts in" */
  label?: string
  /** Text to show when the countdown has ended */
  expiredText?: string
  /** Threshold in ms below which the urgent pulse animation activates (default: 1 hour) */
  urgentThresholdMs?: number
  className?: string
}

function formatTimeSegments(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}

function formatCountdown(ms: number): string {
  const { days, hours, minutes, seconds } = formatTimeSegments(ms)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

const DEFAULT_URGENT_THRESHOLD = 60 * 60 * 1000 // 1 hour

export function CountdownTimer({
  targetDate,
  label,
  expiredText = 'Ended',
  urgentThresholdMs = DEFAULT_URGENT_THRESHOLD,
  className = '',
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => {
    return new Date(targetDate).getTime() - Date.now()
  })

  useEffect(() => {
    const target = new Date(targetDate).getTime()

    function tick() {
      setRemaining(target - Date.now())
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (remaining <= 0) {
    return (
      <span className={`font-mono text-sm text-text-tertiary ${className}`}>
        {expiredText}
      </span>
    )
  }

  const isUrgent = remaining <= urgentThresholdMs

  return (
    <span
      className={`font-mono text-sm font-medium ${
        isUrgent ? 'countdown-urgent text-accent-red' : 'text-text-secondary'
      } ${className}`}
    >
      {label && <span className="mr-1">{label}</span>}
      {formatCountdown(remaining)}
    </span>
  )
}
