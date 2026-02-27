interface TokenAmountProps {
  amount: number
  className?: string
}

export function TokenAmount({ amount, className = '' }: TokenAmountProps) {
  return (
    <span className={`font-mono font-semibold text-accent-amber ${className}`}>
      {amount}
    </span>
  )
}
