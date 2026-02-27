import { SignUp } from '@clerk/clerk-react'

export function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/dashboard"
      />
    </div>
  )
}
