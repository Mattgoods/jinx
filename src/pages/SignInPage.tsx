import { SignIn } from '@clerk/clerk-react'

export function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Jinx</h1>
        <p className="mt-1 text-sm text-text-secondary">Sign in to continue</p>
      </div>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
      />
    </div>
  )
}
