import type { HTMLAttributes, ReactNode } from 'react'

type GlowVariant = 'green' | 'amber'

const glowClasses: Record<GlowVariant, string> = {
  green: 'glow-green',
  amber: 'glow-amber',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  animate?: boolean
  glow?: GlowVariant
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({ children, animate = false, glow, padding = 'md', hover = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-bg-surface ${paddingClasses[padding]} ${animate ? 'card-enter' : ''} ${glow ? glowClasses[glow] : ''} ${hover ? 'casino-card cursor-pointer' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
