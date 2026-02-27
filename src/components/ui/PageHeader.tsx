import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  children?: ReactNode
  backTo?: string
  backLabel?: string
}

export function PageHeader({ title, children, backTo, backLabel }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {backTo && (
        <Link
          to={backTo}
          className="mb-2 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <span aria-hidden="true">&larr;</span> {backLabel || 'Back'}
        </Link>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {children}
      </div>
    </div>
  )
}
