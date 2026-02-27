import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

const inputBase = 'w-full rounded-lg border border-border bg-bg-surface px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-accent-green focus:outline-none'

const OMIT_KEYS = new Set(['as', 'label', 'id', 'error', 'mono', 'children'])

function pickHtmlProps<T>(props: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    if (!OMIT_KEYS.has(key)) {
      result[key] = props[key]
    }
  }
  return result as T
}

interface FormFieldBaseProps {
  label: string
  id: string
  error?: string
}

type InputFieldProps = FormFieldBaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
    as?: 'input'
    mono?: boolean
  }

type SelectFieldProps = FormFieldBaseProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
    as: 'select'
    children: ReactNode
  }

type FormFieldProps = InputFieldProps | SelectFieldProps

export function FormField(props: FormFieldProps) {
  const { label, id, error } = props

  const labelEl = (
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-text-secondary">
      {label}
    </label>
  )

  const errorEl = error ? <p className="mt-1 text-sm text-accent-red">{error}</p> : null

  if (props.as === 'select') {
    const htmlProps = pickHtmlProps<SelectHTMLAttributes<HTMLSelectElement>>(props as unknown as Record<string, unknown>)
    return (
      <div>
        {labelEl}
        <select id={id} className={inputBase} {...htmlProps}>
          {props.children}
        </select>
        {errorEl}
      </div>
    )
  }

  const mono = (props as InputFieldProps).mono
  const htmlProps = pickHtmlProps<InputHTMLAttributes<HTMLInputElement>>(props as unknown as Record<string, unknown>)
  return (
    <div>
      {labelEl}
      <input id={id} className={`${inputBase} ${mono ? 'font-mono' : ''}`} {...htmlProps} />
      {errorEl}
    </div>
  )
}
