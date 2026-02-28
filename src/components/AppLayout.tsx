import { useState, useEffect, useMemo } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { useUserSync } from '../hooks/useUserSync.tsx'
import { useApiClient } from '../lib/api.ts'
import { TokenAmount } from './ui'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/bets', label: 'My Bets' },
  { to: '/profile', label: 'Profile' },
]

function extractGroupId(pathname: string): string | null {
  const match = pathname.match(/^\/group\/([^/]+)/)
  return match ? match[1] : null
}

export function AppLayout() {
  useUserSync()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const api = useApiClient()
  const [groupBalance, setGroupBalance] = useState<number | null>(null)

  const activeGroupId = useMemo(() => extractGroupId(location.pathname), [location.pathname])

  useEffect(() => {
    if (!activeGroupId) {
      setGroupBalance(null)
      return
    }
    api('/users/profile')
      .then((res: { data: { memberships: { group_id: string; token_balance: number }[] } }) => {
        const membership = (res.data.memberships || []).find(
          (m: { group_id: string }) => m.group_id === activeGroupId,
        )
        setGroupBalance(membership ? membership.token_balance : null)
      })
      .catch(() => { /* ignore */ })
  }, [api, activeGroupId])

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border bg-bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="text-xl font-bold tracking-tight text-text-primary">
            Jinx
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-accent-green'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {groupBalance !== null && (
              <span className="flex items-center gap-1 text-sm text-text-secondary">
                🪙 <TokenAmount amount={groupBalance} />
              </span>
            )}
            <UserButton />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center sm:hidden"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-border px-4 py-3 sm:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'text-accent-green'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {groupBalance !== null && (
                <span className="flex items-center gap-1 text-sm text-text-secondary">
                  🪙 <TokenAmount amount={groupBalance} />
                </span>
              )}
              <div className="pt-1">
                <UserButton />
              </div>
            </div>
          </div>
        )}
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
