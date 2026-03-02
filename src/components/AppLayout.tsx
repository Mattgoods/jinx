import { useState, useEffect, useMemo } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { useUserSync } from '../hooks/useUserSync.tsx'
import { useApiClient } from '../lib/api.ts'
import { TokenAmount } from './ui'
import { Sidebar } from './Sidebar.tsx'

function extractGroupId(pathname: string): string | null {
  const match = pathname.match(/^\/group\/([^/]+)/)
  return match ? match[1] : null
}

export function AppLayout() {
  useUserSync()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const api = useApiClient()
  const [groupBalance, setGroupBalance] = useState<number | null>(null)
  const [groupName, setGroupName] = useState<string | null>(null)

  const activeGroupId = useMemo(() => extractGroupId(location.pathname), [location.pathname])

  useEffect(() => {
    if (!activeGroupId) {
      Promise.resolve().then(() => {
        setGroupBalance(null)
        setGroupName(null)
      })
      return
    }
    api('/users/profile')
      .then((res: { data: { memberships: { group_id: string; group_name: string; token_balance: number }[] } }) => {
        const membership = (res.data.memberships || []).find(
          (m: { group_id: string }) => m.group_id === activeGroupId,
        )
        setGroupBalance(membership ? membership.token_balance : null)
        setGroupName(membership ? membership.group_name : null)
      })
      .catch(() => { /* ignore */ })
  }, [api, activeGroupId])

  // Close mobile sidebar on route change
  useEffect(() => {
    Promise.resolve().then(() => setSidebarOpen(false))
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area - offset for desktop sidebar */}
      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-bg-surface/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            {/* Left: hamburger (mobile) + breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary lg:hidden"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Logo on mobile */}
              <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-green">
                  <svg className="h-4 w-4 text-bg-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <span className="text-lg font-bold text-text-primary">Jinx</span>
              </Link>

              {/* Group context breadcrumb */}
              {groupName && (
                <div className="hidden items-center gap-2 text-sm sm:flex">
                  <span className="text-text-tertiary">/</span>
                  <Link to={`/group/${activeGroupId}`} className="font-medium text-text-secondary transition-colors hover:text-accent-green">
                    {groupName}
                  </Link>
                </div>
              )}
            </div>

            {/* Right: balance + user */}
            <div className="flex items-center gap-4">
              {groupBalance !== null && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-primary px-3 py-1.5">
                  <svg className="h-4 w-4 text-accent-amber" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a5.389 5.389 0 01-.428-.79h.422a1 1 0 100-2H8.58a7.488 7.488 0 010-1h.92a1 1 0 100-2h-.422c.154-.32.287-.558.428-.79a.997.997 0 00.23-.021z"/>
                  </svg>
                  <TokenAmount amount={groupBalance} />
                </div>
              )}
              <UserButton />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
