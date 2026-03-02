type BadgeVariant = 'green' | 'amber' | 'red' | 'neutral'

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-accent-green/15 text-accent-green border border-accent-green/20',
  amber: 'bg-accent-amber/15 text-accent-amber border border-accent-amber/20',
  red: 'bg-accent-red/15 text-accent-red border border-accent-red/20',
  neutral: 'bg-border text-text-tertiary border border-border',
}

const statusToVariant: Record<string, BadgeVariant> = {
  active: 'green',
  pending_resolution: 'amber',
  resolved_yes: 'green',
  resolved_no: 'red',
  cancelled: 'neutral',
  yes: 'green',
  no: 'red',
}

interface StatusBadgeProps {
  status: string
  variant?: BadgeVariant
  className?: string
}

export function StatusBadge({ status, variant, className = '' }: StatusBadgeProps) {
  const v = variant ?? statusToVariant[status] ?? 'neutral'
  const label = status.replace(/_/g, ' ').toUpperCase()

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[v]} ${className}`}>
      {label}
    </span>
  )
}
