import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  children?: ReactNode
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
        {title}
      </h1>
      {children}
    </div>
  )
}
