import { SignUp } from '@clerk/clerk-react'

export function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Jinx</h1>
        <p className="mt-1 text-sm text-text-secondary">Create your account</p>
      </div>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/dashboard"
      />
    </div>
  )
}
