import { Link, useLocation } from 'react-router-dom'

const navItems = [
  {
    to: '/dashboard',
    label: 'Casino',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/bets',
    label: 'My Bets',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

const actionItems = [
  {
    to: '/group/create',
    label: 'Create Group',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  {
    to: '/group/join',
    label: 'Join Group',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()

  function isActive(to: string) {
    if (to === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/group/')
    }
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-green">
          <svg className="h-5 w-5 text-bg-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6.99 15c-.7 0-1.26-.56-1.26-1.26 0-.71.56-1.25 1.26-1.25.71 0 1.25.54 1.25 1.25-.01.69-.54 1.26-1.25 1.26zm3.01-7.4c-.76 1.11-1.48 1.46-1.87 2.17-.16.29-.22.48-.22 1.09h-1.98c0-.74.05-1.36.4-2.02.45-.81 1.27-1.42 1.65-2.14.38-.74.27-1.88-.59-2.34-.72-.39-1.67-.17-2.14.42-.39.49-.43 1.04-.43 1.69H7.4c.05-1.74.62-2.66 1.42-3.35 1.11-.96 3.1-1.14 4.46-.41 1.41.75 2.14 2.48 1.74 4.2-.1.43-.33.79-.6 1.15.03-.01.03-.01 0 0l-.01.01c-.01.01-.02.03-.04.05-.02.02-.04.05-.06.08-.04.05-.07.1-.1.15-.01.01-.01.02-.02.03 0 .01-.01.01-.01.02-.06.1-.11.2-.16.3-.03.06-.05.12-.07.17-.02.06-.04.12-.06.18l-.02.09c-.01.05-.02.1-.03.14 0 .03-.01.05-.01.07 0 .03-.01.06-.01.09v.07z"/>
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-text-primary neon-green">
          Jinx
        </span>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {/* Divider */}
        <div className="my-4 border-t border-border" />

        <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Actions
        </p>
        {actionItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={`sidebar-link ${isActive(item.to) ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <div className="online-dot" />
          <span>Jinx v1.0</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:border-r lg:border-border lg:bg-bg-sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-bg-sidebar lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
