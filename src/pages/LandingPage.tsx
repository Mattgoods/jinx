import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

export function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth()

  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4">
      <h1 className="mb-4 text-5xl font-bold tracking-tight text-text-primary" style={{ letterSpacing: '-0.02em' }}>
        Jinx
      </h1>
      <p className="mb-8 max-w-md text-center text-lg text-text-secondary">
        A social prediction market where friends bet fake currency on whether someone will say a specific word.
      </p>
      <div className="flex gap-4">
        <Link
          to="/sign-in"
          className="rounded-lg bg-accent-green px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-green/90"
        >
          Sign In
        </Link>
        <Link
          to="/sign-up"
          className="rounded-lg border border-border bg-transparent px-6 py-3 font-semibold text-text-secondary transition-colors hover:bg-bg-hover"
        >
          Sign Up
        </Link>
      </div>
    </div>
  )
}
