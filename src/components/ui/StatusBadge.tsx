type BadgeVariant = 'green' | 'amber' | 'red' | 'neutral'

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-accent-green/15 text-accent-green',
  amber: 'bg-accent-amber/15 text-accent-amber',
  red: 'bg-accent-red/15 text-accent-red',
  neutral: 'bg-border text-text-tertiary',
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
