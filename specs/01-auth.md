# 01 — Authentication

## Topic
User authentication via Clerk with Google OAuth as the sole sign-in method, and syncing user records between Clerk and Supabase.

## Acceptance Criteria

- Users sign in exclusively via Google OAuth through Clerk — no email/password option exists
- After first sign-in, a user record is created in the Supabase `users` table linked by `clerk_id`
- Subsequent sign-ins update the user's `display_name` and `avatar_url` from their Google profile
- Every protected API endpoint verifies the Clerk session token and rejects requests with missing or invalid tokens (HTTP 401)
- Unauthenticated users accessing protected frontend routes are redirected to `/sign-in`
- The Clerk publishable key is the only auth-related value exposed to the frontend
- The Supabase service role key is only used server-side in serverless functions, never sent to the client
- Sign-out clears the Clerk session and redirects to the landing page

## User Flows

- **New user:** Lands on `/` → clicks Sign Up → Google OAuth → redirected to `/dashboard` → user sync creates DB record → user sees empty state (no group yet)
- **Returning user:** Clicks Sign In → Google OAuth → `/dashboard` → user sync updates profile → sees their group's active markets
- **Expired session:** User on a protected page → token expires → next API call returns 401 → frontend redirects to `/sign-in`
