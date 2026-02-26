# Jinx — Implementation Plan

> **Status:** Greenfield. No source code exists yet. All specs and docs are in place.
> **Goal:** A social prediction market where friends bet fake currency on whether someone will say a specific word during a given time window.
> **Stack:** React 19 + Vite + TypeScript + Tailwind v4 + React Router v7 · Vercel Serverless Functions · Supabase (PostgreSQL) · Clerk (Google OAuth)

---

## Dependency Graph

```
Phase 1: Scaffolding
    └── Phase 2: DB Schema
            └── Phase 3: API Shared Utils
                    └── Phase 4: Auth
                            └── Phase 5: Groups
                                    └── Phase 6: Markets
                                            ├── Phase 7: Betting
                                            │       └── Phase 9: Leaderboard & Stats
                                            └── Phase 8: Token Economy
Phase 10: UI Polish (parallel with Phases 5–9)
```

---

## Phase 1 — Project Scaffolding

**Priority: Critical (everything depends on this)**

### 1.1 Initialize Vite + React project
- Run `npm create vite@latest . -- --template react-ts`
- Install dependencies: `react-router`, `@clerk/clerk-react`, `@supabase/supabase-js`

### 1.2 Configure Tailwind CSS v4
- Install `tailwindcss@^4`, `@tailwindcss/vite`
- Wire Tailwind plugin into `vite.config.ts`
- Set up CSS entry with `@import "tailwindcss"`
- Configure custom design tokens: colors (#0F1117, #1A1D27, #10B981, etc.), Inter + JetBrains Mono fonts

### 1.3 Configure React Router v7
- Set up root layout with `<Outlet />`
- Define routes: `/`, `/sign-in`, `/sign-up`, `/dashboard`, `/markets/new`, `/markets/:id`, `/markets/:id/resolve`, `/leaderboard`, `/profile`, `/group/settings`
- Add Clerk `<ProtectedRoute>` wrapper to redirect unauthenticated users to `/sign-in`

### 1.4 Vercel project structure
- Create `vercel.json` with SPA catch-all rewrite + daily cron at `0 6 * * *` pointing to `/api/cron/distribute`
- Create `api/` directory skeleton matching the endpoint list in spec 08
- Set up `.env.example` documenting all five env vars

### 1.5 TypeScript config
- Ensure `tsconfig.json` covers both `src/` and `api/` paths
- Strict mode on

---

## Phase 2 — Database Schema

**Priority: Critical (all API endpoints depend on this)**

### 2.1 Write Supabase migration
- File: `supabase/migrations/001_initial_schema.sql`
- Create custom ENUM types: `market_status`, `bet_side`
- Create tables in order: `users` → `groups` → `group_members` → `markets` → `bets` → `token_distributions`
- Create all indexes (per `docs/data-model.md`)
- Enable RLS on all tables; add the five SELECT policies
- Apply via `supabase db push`

### 2.2 Verify schema
- Confirm CHECK constraints on `markets` (`yes_pool + no_pool = total_pool`, `window_end > window_start`)
- Confirm CHECK constraint on `bets` (`amount > 0`)
- Confirm UNIQUE constraint on `group_members (group_id, user_id)`

---

## Phase 3 — API Shared Utilities

**Priority: Critical (every endpoint depends on these)**

### 3.1 `api/_lib/supabase.ts`
- Initialize Supabase client with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Export singleton client (service role, bypasses RLS)

### 3.2 `api/_lib/auth.ts`
- Accept `Authorization: Bearer <token>` header
- Verify token via `@clerk/backend` `verifyToken()`
- Look up `users` row by `clerk_id`
- Return `{ userId, clerkId }` or throw structured 401 error
- Reused by all authenticated endpoints

### 3.3 `api/_lib/response.ts`
- `ok(data)` → `200 { data: { ... } }`
- `err(code, message, status)` → `{ error: { code, message } }` with appropriate HTTP status
- Standard error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `INSUFFICIENT_BALANCE`, `MARKET_NOT_BETTABLE`, `INTERNAL_ERROR`

---

## Phase 4 — Authentication

**Priority: High (groups, markets, betting all require authenticated users)**

### 4.1 `POST /api/users/sync`
- Verify Clerk token → extract `userId`, `displayName`, `avatarUrl`
- Upsert into `users` table (`ON CONFLICT (clerk_id) DO UPDATE`)
- Return updated user record

### 4.2 Frontend: Clerk setup
- Wrap app in `<ClerkProvider publishableKey={...}>`
- Add `<SignIn>` page at `/sign-in` using Clerk-hosted UI or embedded component
- After sign-in: call `POST /api/users/sync` via `useEffect` → redirect to `/dashboard`

### 4.3 Frontend: `useApiClient` hook (`src/hooks/useApiClient.ts`)
- Wraps `fetch` with `Authorization: Bearer <token>` from `useAuth()`
- Returns typed `get()`, `post()`, `put()`, `delete()` methods
- Used by all data-fetching hooks

### 4.4 Frontend: Protected routes
- Redirect unauthenticated users to `/sign-in` on any route except `/` and `/sign-in`

---

## Phase 5 — Groups

**Priority: High (markets are scoped to groups)**

### 5.1 `POST /api/groups/create`
- Auth: verify Clerk token
- Generate unique 8-char alphanumeric invite code (loop until unique)
- `INSERT` into `groups` with caller as `admin_user_id`
- `INSERT` into `group_members` (admin joins immediately with `token_balance = 0`)
- Return group record

### 5.2 `POST /api/groups/join`
- Auth: verify Clerk token
- Look up group by `invite_code`; 404 if not found
- Check caller is not already a member; 400 "already a member" if so
- `INSERT` into `group_members` with `token_balance = 0`
- Return group record

### 5.3 `GET /api/groups/settings`
- Auth + group membership check (403 for non-members)
- Admin check (403 if not admin)
- Return full group settings + member roster

### 5.4 `PUT /api/groups/settings`
- Auth + admin check
- Allow updating: `name`, `weekly_token_amount`, `token_distribution_day`
- Optionally regenerate `invite_code` if requested

### 5.5 `DELETE /api/groups/members`
- Auth + admin check
- Cannot remove self; return 400
- `DELETE` from `group_members` where `group_id` and `user_id` match

### 5.6 Frontend: Dashboard (`/dashboard`)
- If user has no groups: show "Create Group" and "Join Group" CTAs
- If user is in groups: list active markets for the active group
- Group switcher in navigation for multi-group users

### 5.7 Frontend: Create/Join Group forms
- Create: modal or page with name input → calls `POST /api/groups/create` → shows invite code
- Join: input for invite code → calls `POST /api/groups/join`

### 5.8 Frontend: Group settings page (`/group/settings`)
- Admin only (redirect non-admins away)
- Edit name, weekly token amount, distribution day
- Regenerate invite code button
- Member roster with remove buttons

---

## Phase 6 — Markets

**Priority: High (core product feature)**

### 6.1 `GET /api/markets`
- Auth + group membership check
- Query `markets` where `group_id` matches; support `?status=` filter
- Lazy status update: if any market has `status = 'active'` and `window_end < now()`, update it to `pending_resolution` before returning
- Redact `secret_word` where `target_user_id = requestingUserId`
- Return array of market records

### 6.2 `POST /api/markets/create`
- Auth + group membership check
- Validate: `target_user_id != creator_id`, `window_start > now()`, `window_end > window_start`
- Confirm target is a group member (403 otherwise)
- `INSERT` into `markets`
- Return created market record (with `secret_word` visible to creator)

### 6.3 `GET /api/markets/[id]`
- Auth + group membership check
- Fetch market + all bets for that market
- Redact `secret_word` if `target_user_id = requestingUserId` AND market status is not resolved
- Return market with bets

### 6.4 `POST /api/markets/resolve`
- Auth: verify creator only
- Validate: `window_end < now()` (time window has passed)
- Validate: market status is `pending_resolution`
- Accept `{ resolution: 'yes' | 'no' }`
- In a DB transaction:
  - Update `markets.status` to `resolved_yes` or `resolved_no`, set `resolved_at`
  - Calculate payouts: `floor(bet_amount / winning_pool * total_pool)` for each winning bet
  - Update all `bets.payout` values (0 for losers)
  - Credit winners' `group_members.token_balance` with their payout
- Return updated market + payout summary

### 6.5 `POST /api/markets/cancel`
- Auth: verify creator only
- Validate: market is `active` or `pending_resolution` (not already resolved)
- In a DB transaction:
  - Update `markets.status` to `cancelled`
  - Set all `bets.payout = bets.amount` (full refund)
  - Restore each bettor's `group_members.token_balance` with their bet amount
- Return updated market

### 6.6 Frontend: Market feed (dashboard)
- List market cards with: target name, secret word (or "REDACTED"), time window, probability bar (green YES / red NO), pool size, bet counts
- Status badge (active / pending resolution / resolved / cancelled) per spec 07 design
- Amber glow for pending resolution cards, green glow for active cards

### 6.7 Frontend: Create market form (`/markets/new`)
- Select target from group member dropdown (excludes self)
- Secret word input
- Start/end datetime pickers (start must be future)
- Submit → calls `POST /api/markets/create`

### 6.8 Frontend: Market detail (`/markets/:id`)
- Full market card + bet list
- Bet placement UI (Phase 7)
- Resolve/cancel buttons for creator (conditionally shown)

### 6.9 Frontend: Resolve page (`/markets/:id/resolve`)
- YES / NO resolution buttons
- Confirms and shows payout summary

---

## Phase 7 — Betting

**Priority: High (core game mechanic)**

### 7.1 `POST /api/bets/place`
- Auth + group membership check
- Validate: market `status = 'active'` AND `window_end > now()`; else `MARKET_NOT_BETTABLE`
- Validate: `requestingUserId != market.target_user_id`; else `FORBIDDEN`
- Validate: `amount >= 1`
- Validate: user's `token_balance >= amount`; else `INSUFFICIENT_BALANCE`
- In a single DB transaction:
  - `INSERT` into `bets`
  - `UPDATE group_members SET token_balance = token_balance - amount`
  - `UPDATE markets SET yes_pool/no_pool/total_pool += amount`
- Return new bet record + updated `token_balance`

### 7.2 Frontend: Bet placement UI (on market detail)
- YES and NO buttons with current odds displayed
- Amount input with available balance shown
- Preview payout calculation: `floor(amount / (side_pool + amount) * (total_pool + amount))`
- On submit: calls `POST /api/bets/place`
- After success: scale + glow pulse animation; update probability bar (500ms ease); count-down token balance

### 7.3 Frontend: Probability bar
- Green fill for YES%, red background for NO%
- Animates on pool change (500ms ease transition)
- Displays 50/50 when `total_pool = 0`

---

## Phase 8 — Token Economy

**Priority: Medium (game runs without it initially, but needed for ongoing play)**

### 8.1 `POST /api/cron/distribute`
- Auth: validate `CRON_SECRET` header (not a Clerk token)
- Determine current day of week (UTC)
- Query all groups where `token_distribution_day = today`
- For each group, query all members
- For each member, check `token_distributions` for existing record in current ISO week (Mon–Sun)
- If none exists: `INSERT` into `token_distributions` + `UPDATE group_members SET token_balance += weekly_token_amount`
- Return summary of distributions performed

### 8.2 Cron configuration
- `vercel.json` already set to `0 6 * * *` daily
- Ensure `CRON_SECRET` is set in Vercel project env vars

---

## Phase 9 — Leaderboard & Stats

**Priority: Medium (requires resolved bets to be meaningful)**

### 9.1 `GET /api/leaderboard`
- Auth + group membership check
- Query: `SUM(payout - amount)` grouped by user for all resolved bets in the group
- Compute win rate: winning bets / total resolved bets per user
- Return ranked array: `{ rank, userId, displayName, avatarUrl, profitLoss, totalBets, winRate }`

### 9.2 `GET /api/users/profile`
- Auth: no group scoping (returns all groups for user)
- Return: group memberships with `token_balance`, bet history (with market details, redacted for unresolved targeted markets), aggregate P/L
- Bet history includes: market target, word (revealed only if resolved), side, amount, payout

### 9.3 Frontend: Leaderboard page (`/leaderboard`)
- Ranked list with rank number, avatar, display name, P/L, win rate
- Highlight current user's row
- Use JetBrains Mono for P/L numbers

### 9.4 Frontend: Profile page (`/profile`)
- Token balances per group
- Bet history table with outcomes
- Aggregate lifetime P/L (prominently displayed)

---

## Phase 10 — UI Polish

**Priority: Medium (can be applied iteratively alongside Phases 5–9)**

### 10.1 Design tokens
- CSS variables for all spec 07 colors (#0F1117, #1A1D27, #242836, #2A2E3B, #10B981, #F59E0B, #EF4444, #F1F5F9, #94A3B8, #64748B)
- Google Fonts: Inter + JetBrains Mono loaded in `index.html`
- Tailwind config extended with custom colors and font families

### 10.2 Component library
- **Button**: three variants — `primary` (green), `danger` (red), `ghost` (transparent + border)
- **StatusBadge**: pill-shaped with translucent accent backgrounds per status
- **MarketCard**: soft box-shadow glow (green = active, amber = pending resolution)
- **ProbabilityBar**: green YES fill, red NO background with smooth transition
- **Toast**: bet confirmation and resolution notifications (Sonner or custom)
- **Avatar**: circular user avatar with fallback initials

### 10.3 Animations
- Market cards: fade-and-rise on mount (300ms)
- Probability bar: 500ms ease on update
- Token balance: count-up/down with easing on bet/resolution
- Bet confirmation: scale + glow pulse on accent color
- Countdown timer: subtle pulse as window approaches zero
- Rule: no decorative animations — all communicate state changes

### 10.4 Responsive layout
- Mobile: single-column, stacked cards, collapsed navigation
- Desktop: grid layout for market cards, sidebar navigation or top nav
- Tailwind breakpoints: `sm` (640px), `md` (768px), `lg` (1024px)

---

## Implementation Order Summary

| # | Phase | Deliverables | Depends On |
|---|---|---|---|
| 1 | Scaffolding | Vite project, Tailwind, routing, vercel.json | — |
| 2 | DB Schema | Supabase migration SQL applied | 1 |
| 3 | API Shared Utils | `auth.ts`, `supabase.ts`, `response.ts` | 1, 2 |
| 4 | Authentication | `/api/users/sync`, Clerk frontend, `useApiClient` | 3 |
| 5 | Groups | 5 endpoints + create/join/settings UI | 4 |
| 6 | Markets | 5 endpoints + feed/create/detail/resolve UI | 5 |
| 7 | Betting | `bets/place` endpoint + bet UI + probability bar | 6 |
| 8 | Token Economy | Cron endpoint + distribution logic | 5 |
| 9 | Leaderboard & Stats | 2 endpoints + leaderboard/profile UI | 7 |
| 10 | UI Polish | Design system, animations, responsive layout | All |

---

## Key Invariants to Enforce Everywhere

1. **Token balance never goes negative** — check before every deduct operation
2. **Bet placement is atomic** — single DB transaction: insert bet + deduct balance + update pools
3. **Market resolution is atomic** — single DB transaction: update status + set all payouts + credit winners
4. **Secret word redaction is server-side** — strip `secret_word` from response when requester is target AND market is not resolved
5. **Group membership verified on every group-scoped endpoint** — 403 for non-members
6. **Admin check on destructive/settings endpoints** — 403 for non-admins
7. **Token distribution is idempotent** — check `token_distributions` table for current ISO week before distributing
8. **Market status lazy update** — check `window_end < now()` on every market read and update `active` → `pending_resolution` in place
