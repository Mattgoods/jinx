import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  animate?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({ children, animate = false, padding = 'md', className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-bg-surface ${paddingClasses[padding]} ${animate ? 'card-enter' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
