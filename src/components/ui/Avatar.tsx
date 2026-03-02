type AvatarSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: 'h-8 w-8', text: 'text-sm' },
  md: { container: 'h-10 w-10', text: 'text-sm' },
  lg: { container: 'h-16 w-16', text: 'text-2xl' },
}

interface AvatarProps {
  src?: string | null
  name: string
  size?: AvatarSize
  className?: string
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const { container, text } = sizeClasses[size]

  if (src) {
    return <img src={src} alt="" className={`${container} rounded-full ring-2 ring-border ${className}`} />
  }

  return (
    <div className={`flex ${container} items-center justify-center rounded-full bg-accent-green/20 ${text} font-semibold text-accent-green ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
