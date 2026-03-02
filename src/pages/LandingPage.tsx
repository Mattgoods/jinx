import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/ui'

export function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth()

  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      {/* Top bar */}
      <header className="border-b border-border bg-bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/jinx-logo.png" alt="Jinx" className="h-9 w-9 rounded-lg" />
            <span className="text-2xl font-bold tracking-tight text-text-primary">Jinx</span>
          </div>
          <div className="flex items-center gap-3">
            <Button as="link" to="/sign-in" variant="ghost" size="md">Login</Button>
            <Button as="link" to="/sign-up" size="md">Register</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          {/* Decorative elements */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-accent-green/10 ring-1 ring-accent-green/20">
                <img src="/jinx-logo.png" alt="Jinx" className="h-14 w-14" />
              </div>
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-accent-green shadow-[0_0_8px_rgba(0,231,1,0.6)]" />
            </div>
          </div>

          <h1 className="mb-4 text-5xl font-bold tracking-tight text-text-primary sm:text-6xl" style={{ letterSpacing: '-0.03em' }}>
            The Social
            <br />
            <span className="neon-green text-accent-green">Prediction Market</span>
          </h1>
          <p className="mx-auto mb-10 max-w-lg text-lg text-text-secondary">
            Bet fake currency on whether your friends will say a specific word.
            Create groups, set up markets, and compete on the leaderboard.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button as="link" to="/sign-up" size="lg" className="min-w-[180px]">
              Register
            </Button>
            <Button as="link" to="/sign-in" variant="ghost" size="lg" className="min-w-[180px]">
              Login
            </Button>
          </div>

          {/* Feature cards */}
          <div className="mt-20 mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-bg-surface p-6 text-left">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-green/15">
                <svg className="h-5 w-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mb-1 font-semibold text-text-primary">Create Groups</h3>
              <p className="text-sm text-text-secondary">Invite friends with a code and play together.</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-surface p-6 text-left">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-amber/15">
                <svg className="h-5 w-5 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mb-1 font-semibold text-text-primary">Set Up Markets</h3>
              <p className="text-sm text-text-secondary">Pick a target, set a secret word, and watch the bets roll in.</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-surface p-6 text-left">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue/15">
                <svg className="h-5 w-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mb-1 font-semibold text-text-primary">Climb Leaderboards</h3>
              <p className="text-sm text-text-secondary">Track wins, losses, and compete for the top spot.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-surface/50 py-6 text-center">
        <p className="text-sm text-text-tertiary">&copy; 2026 Jinx. The social prediction market.</p>
      </footer>
    </div>
  )
}
