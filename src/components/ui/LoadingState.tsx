interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="spinner" />
      <span className="text-text-secondary text-sm">{message}</span>
    </div>
  )
}
