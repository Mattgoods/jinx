import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type ButtonVariant = 'primary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent-green text-bg-primary hover:brightness-110 shadow-[0_0_12px_rgba(0,231,1,0.25)]',
  danger: 'bg-accent-red text-white hover:brightness-110 shadow-[0_0_12px_rgba(237,65,99,0.25)]',
  ghost: 'border border-border bg-bg-surface text-text-secondary hover:bg-bg-hover hover:text-text-primary hover:border-text-tertiary',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

interface ButtonBaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
}

type ButtonAsButton = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    as?: 'button'
  }

type ButtonAsLink = ButtonBaseProps &
  Omit<LinkProps, keyof ButtonBaseProps> & {
    as: 'link'
    to: string
  }

type ButtonProps = ButtonAsButton | ButtonAsLink

function omitBaseProps<T extends ButtonBaseProps & { as?: string }>(props: T) {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    if (key !== 'variant' && key !== 'size' && key !== 'className' && key !== 'children' && key !== 'as') {
      result[key] = (props as Record<string, unknown>)[key]
    }
  }
  return result
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', className = '', children } = props
  const base = `inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  if (props.as === 'link') {
    const rest = omitBaseProps(props) as Omit<LinkProps, keyof ButtonBaseProps>
    return (
      <Link className={base} {...rest}>
        {children}
      </Link>
    )
  }

  const rest = omitBaseProps(props) as Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps>
  return (
    <button className={base} {...rest}>
      {children}
    </button>
  )
}
