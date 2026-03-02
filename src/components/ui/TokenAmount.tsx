interface TokenAmountProps {
  amount: number
  className?: string
  showIcon?: boolean
}

export function TokenAmount({ amount, className = '', showIcon = false }: TokenAmountProps) {
  return (
    <span className={`inline-flex items-center gap-1 font-mono font-semibold text-accent-amber ${className}`}>
      {showIcon && (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.3" />
          <circle cx="10" cy="10" r="6" fill="currentColor" opacity="0.6" />
          <text x="10" y="14" textAnchor="middle" fontSize="10" fill="var(--color-bg-primary)" fontWeight="bold">$</text>
        </svg>
      )}
      {amount.toLocaleString()}
    </span>
  )
}
