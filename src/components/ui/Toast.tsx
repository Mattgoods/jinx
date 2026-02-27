import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { ToastContext, type ToastVariant } from './ToastContext'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
  exiting?: boolean
}

let toastCounter = 0

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-l-4 border-l-accent-green bg-accent-green/10 text-accent-green',
  error: 'border-l-4 border-l-accent-red bg-accent-red/10 text-accent-red',
  info: 'border-l-4 border-l-accent-amber bg-accent-amber/10 text-accent-amber',
}

const variantIcons: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const AUTO_DISMISS_MS = 4000
const EXIT_ANIMATION_MS = 200

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-lg border border-border bg-bg-surface px-4 py-3 shadow-lg ${
        toast.exiting ? 'toast-exit' : 'toast-enter'
      } ${variantStyles[toast.variant]}`}
    >
      <span className="text-lg font-bold leading-none">{variantIcons[toast.variant]}</span>
      <p className="flex-1 text-sm font-medium text-text-primary">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-2 text-text-tertiary transition-colors hover:text-text-primary"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: string) => {
    // Clear any existing timer
    const existing = timersRef.current.get(id)
    if (existing) {
      clearTimeout(existing)
      timersRef.current.delete(id)
    }

    // Mark as exiting for animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))

    // Remove after exit animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, EXIT_ANIMATION_MS)
  }, [])

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      toastCounter += 1
      const id = `toast-${toastCounter}`
      setToasts((prev) => [...prev, { id, message, variant }])

      // Auto-dismiss
      const timer = setTimeout(() => {
        timersRef.current.delete(id)
        dismissToast(id)
      }, AUTO_DISMISS_MS)
      timersRef.current.set(id, timer)
    },
    [dismissToast],
  )

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-label="Notifications">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
