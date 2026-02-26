# 08 — API & Serverless Functions

## Topic
Vercel serverless function patterns, request/response contracts, error handling, and auth verification for all backend endpoints.

## Acceptance Criteria

- Every API endpoint lives under `/api/` and is a Vercel serverless function
- Every authenticated endpoint verifies the Clerk session token from the `Authorization: Bearer` header
- Invalid or missing tokens return HTTP 401 with `{ error: { code: "UNAUTHORIZED", message: "..." } }`
- All successful responses use the shape `{ data: { ... } }`
- All error responses use the shape `{ error: { code: "ERROR_CODE", message: "..." } }`
- Common error codes are consistent: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST, INSUFFICIENT_BALANCE, MARKET_NOT_BETTABLE, INTERNAL_ERROR
- A shared auth utility in `api/_lib/auth.ts` handles token verification and user lookup, reused by all endpoints
- A shared Supabase client in `api/_lib/supabase.ts` initializes with the service role key, reused by all endpoints
- Write operations that touch multiple tables (bet placement, market resolution, cancellation) use database transactions
- Group membership is verified on every group-scoped endpoint — non-members receive HTTP 403
- Admin-only endpoints (group settings updates, member removal) verify the requesting user is the group admin
- The cron endpoint for token distribution authenticates via a `CRON_SECRET` header, not a Clerk token

## Endpoints

- `POST /api/users/sync` — Upsert user record from Clerk profile
- `GET /api/users/profile` — Current user's profile, group memberships, and aggregate stats
- `POST /api/groups/create` — Create new group (caller becomes admin)
- `POST /api/groups/join` — Join group via invite code
- `GET /api/groups/settings` — Group settings (admin only)
- `PUT /api/groups/settings` — Update group settings (admin only)
- `DELETE /api/groups/members` — Remove a member (admin only)
- `GET /api/markets` — List markets for a group, filterable by status
- `POST /api/markets/create` — Create a new market
- `GET /api/markets/[id]` — Single market detail with bets (redacts word for target)
- `POST /api/markets/resolve` — Resolve a market (creator only, after window closes)
- `POST /api/markets/cancel` — Cancel a market and refund bets (creator only)
- `POST /api/bets/place` — Place a bet on an active market
- `GET /api/leaderboard` — Group leaderboard by profit/loss
- `POST /api/cron/distribute` — Weekly token distribution (cron-authenticated)
