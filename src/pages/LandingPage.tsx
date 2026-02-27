import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/ui'

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
        <Button as="link" to="/sign-in" size="lg">Sign In</Button>
        <Button as="link" to="/sign-up" variant="ghost" size="lg">Sign Up</Button>
      </div>
    </div>
  )
}
