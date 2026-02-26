# Authentication

## Overview

Authentication is handled entirely by **Clerk** with **Google OAuth** as the only sign-in method. There is no email/password flow. The auth architecture splits into two layers:

1. **Frontend:** Clerk React SDK manages session state, sign-in/sign-up UI, and provides session tokens for API calls.
2. **Backend:** Each Vercel serverless function verifies the Clerk session token and maps the Clerk user ID to the internal `users` table.

---

## Clerk Configuration

### Project Setup

1. Create a Clerk application at [clerk.com](https://clerk.com).
2. Under **Social Connections**, enable **Google** and disable all other providers.
3. Under **Email, Phone, Username**, disable all options (Google OAuth only).
4. Set the following redirect URLs:
   - **Sign-in redirect:** `/dashboard`
   - **Sign-up redirect:** `/dashboard` (the post-signup sync hook handles new users)
   - **After sign-out:** `/`

### Environment Variables

| Variable | Location | Value |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Vercel (frontend) | `pk_live_...` or `pk_test_...` |
| `CLERK_SECRET_KEY` | Vercel (serverless) | `sk_live_...` or `sk_test_...` |

### Google OAuth Setup

1. In the Google Cloud Console, create an OAuth 2.0 client ID (Web application type).
2. Add Clerk's redirect URI to the authorized redirect URIs (Clerk provides this in the Social Connections settings).
3. Copy the Client ID and Client Secret into Clerk's Google provider configuration.
4. Requested scopes: `openid`, `email`, `profile` (Clerk handles this automatically).

---

## Frontend Auth Flow

### Provider Setup

```tsx
// src/main.tsx
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ClerkProvider>
);
```

### Sign-In / Sign-Up Pages

```tsx
// src/pages/SignInPage.tsx
import { SignIn } from '@clerk/clerk-react';

export function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
      />
    </div>
  );
}
```

```tsx
// src/pages/SignUpPage.tsx
import { SignUp } from '@clerk/clerk-react';

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
  );
}
```

### Route Protection

```tsx
// src/components/RequireAuth.tsx
import { useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
```

### Post-Signup User Sync

After a user signs in for the first time, the app needs to create a corresponding record in the `users` table. This is triggered on the Dashboard page (the first protected page a user hits):

```tsx
// src/hooks/useUserSync.ts
import { useUser } from '@clerk/clerk-react';
import { useEffect, useRef } from 'react';
import { useApiClient } from '../lib/api';

export function useUserSync() {
  const { user, isLoaded } = useUser();
  const api = useApiClient();
  const synced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || synced.current) return;
    synced.current = true;

    api('/users/sync', {
      method: 'POST',
      body: JSON.stringify({
        displayName: user.fullName || user.firstName || 'Anonymous',
        avatarUrl: user.imageUrl,
      }),
    }).catch(console.error);
  }, [isLoaded, user]);
}
```

This is an upsert — safe to call on every sign-in. If the user already exists, it updates their display name and avatar.

---

## Backend Auth Verification

Every serverless function verifies the Clerk session token before processing the request.

### Shared Auth Middleware

```typescript
// api/_lib/auth.ts
import { verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthContext {
  clerkId: string;
  userId: string; // internal UUID from users table
}

export async function authenticate(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify with Clerk
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  const clerkId = payload.sub;

  // Look up internal user
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();

  if (error || !user) {
    throw new AuthError('User not found in database');
  }

  return { clerkId, userId: user.id };
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
```

### Usage in a Serverless Function

```typescript
// api/markets/index.ts
import { authenticate, AuthError } from '../_lib/auth';

export default async function handler(req: Request) {
  try {
    const auth = await authenticate(req);

    // auth.userId is the internal UUID — use for all queries
    const { data: markets } = await supabase
      .from('markets')
      .select('*')
      .eq('group_id', groupId);

    return Response.json({ data: { markets } });

  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json(
        { error: { code: 'UNAUTHORIZED', message: err.message } },
        { status: 401 }
      );
    }
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
```

---

## User Record Syncing Between Clerk and Supabase

### Data Flow

```
Google OAuth → Clerk (manages identity) → App DB users table (app-specific record)
```

Clerk is the source of truth for identity and session management. The `users` table in Supabase stores the app-specific record with the `clerk_id` as the link.

### Sync Points

| Event | Action |
|---|---|
| First sign-in | `POST /api/users/sync` creates user record |
| Subsequent sign-in | `POST /api/users/sync` updates `display_name` and `avatar_url` |
| Name change in Clerk | Updated on next sync call (next page load) |
| User deletion in Clerk | Not automatically synced. Handle manually or via Clerk webhook (future). |

### Sync Endpoint Logic

```typescript
// api/users/sync.ts
export default async function handler(req: Request) {
  const auth = await authenticateClerkOnly(req); // verify token, get clerkId only
  const { displayName, avatarUrl } = await req.json();

  const { data: user } = await supabase
    .from('users')
    .upsert(
      {
        clerk_id: auth.clerkId,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: 'clerk_id' }
    )
    .select()
    .single();

  return Response.json({ data: user });
}
```

---

## Route Protection Summary

| Route Pattern | Protection | Notes |
|---|---|---|
| `/` | None | Public landing page |
| `/sign-in`, `/sign-up` | None | Clerk components handle auth |
| `/dashboard` | `RequireAuth` | First load triggers user sync |
| `/markets/*` | `RequireAuth` + group membership check | API validates group membership |
| `/group/create` | `RequireAuth` | Available even without a group |
| `/group/join` | `RequireAuth` | Available even without a group |
| `/group/settings` | `RequireAuth` + admin check | API returns 403 if not admin |
| `/leaderboard` | `RequireAuth` + group membership | |
| `/profile` | `RequireAuth` | |
| `/history` | `RequireAuth` + group membership | |

### Frontend vs Backend Protection

**Frontend** (`RequireAuth`): Prevents unauthenticated users from seeing protected pages. This is a UX concern — it redirects to sign-in immediately.

**Backend** (serverless `authenticate()`): The real security gate. Even if someone bypasses the frontend route guard, every API call independently verifies the session token and checks permissions (group membership, admin status, not-target, etc.).

---

## Security Considerations

- **Session tokens** are short-lived JWTs issued by Clerk. They are not stored in localStorage — Clerk manages them via its SDK.
- **Service role key** for Supabase is only used server-side (in Vercel environment variables). It never reaches the client.
- **RLS policies** exist as defense-in-depth but are not the primary access control mechanism. The serverless functions are.
- **Secret word** is stored in plaintext in the DB. It is only sensitive within the game context (hidden from the target user). API-layer redaction handles this — no DB-level encryption needed.
- **CORS** is not an issue since the frontend and API are deployed to the same Vercel project (same origin).
- **Rate limiting** is not implemented in v1 but should be added to bet placement and market creation endpoints to prevent abuse.
