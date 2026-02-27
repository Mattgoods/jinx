# Jinx — Implementation Plan

A social prediction market where friends bet fake currency on whether someone will say a specific word during a given time window.

**Stack:** React 19 + Vite + TypeScript + Tailwind v4, Vercel Serverless Functions, Supabase (PostgreSQL), Clerk (Google OAuth)

---

## Completed

### Phase 0 — Project Scaffold ✅
- Vite + React 19 + TypeScript project initialized
- Tailwind CSS v4 configured with `@import "tailwindcss"` and `@theme` design tokens in `src/index.css`
- Inter + JetBrains Mono fonts loaded from Google Fonts
- Path alias `@/` → `src/` configured in `tsconfig.app.json` + `vite.config.ts`
- `vercel.json` with SPA rewrite and `/api/cron/distribute` daily cron at `0 6 * * *`
- All dependencies installed: `react-router`, `@clerk/clerk-react`, `@clerk/backend`, `@supabase/supabase-js`, `tailwindcss@^4`, `@tailwindcss/vite`, `vitest`, `@vercel/node`
- ESLint configured, TypeScript strict mode enabled

### Phase 1 — Database Schema ✅
- `supabase/migrations/001_initial_schema.sql` created with:
  - Custom ENUMs: `market_status`, `bet_side`
  - All 6 tables: `users`, `groups`, `group_members`, `markets`, `bets`, `token_distributions`
  - Indexes on all FKs and commonly queried columns
  - CHECK constraints for data integrity
  - RLS enabled on all tables with SELECT policies
  - `increment_balance` RPC for atomic balance changes
  - `place_bet` RPC with `SELECT ... FOR UPDATE` for race condition protection

### Phase 2 — Authentication ✅
- `src/main.tsx`: ClerkProvider + BrowserRouter wrapping App
- `src/components/RequireAuth.tsx`: redirects unauthenticated users to `/sign-in`
- `src/App.tsx`: full route tree with all pages
- `src/lib/api.ts`: `useApiClient()` hook — auto-attaches Clerk Bearer token
- `src/hooks/useUserSync.tsx`: calls `POST /api/users/sync` on sign-in
- `api/_lib/auth.ts`: `verifyAuth()`, `requireGroupMember()`, `requireGroupAdmin()`, error response helpers
- `api/_lib/supabase.ts`: singleton Supabase client with service role key
- `api/users/sync.ts`: upsert user from Clerk profile

### Phase 3 — Groups ✅
- `api/groups/create.ts`: create group with unique 8-char invite code, creator as admin + first member
- `api/groups/join.ts`: join via invite code, duplicate check
- `api/groups/settings.ts`: GET/PUT group settings (admin only), validation
- `api/groups/members.ts`: DELETE member (admin only, cannot remove self)
- `api/groups/regenerate-invite.ts`: regenerate invite code (admin only)
- `src/pages/CreateGroupPage.tsx`, `JoinGroupPage.tsx`, `GroupSettingsPage.tsx`: full forms

### Phase 4 — Markets ✅
- `api/markets/create.ts`: all validations (self-target, membership, future start, end > start)
- `api/markets/index.ts`: list with status filter, lazy `pending_resolution` transition, secret word redaction
- `api/markets/[id].ts`: detail with bets, redaction, lazy status transition
- `api/markets/resolve.ts`: parimutuel payout calculation, winner crediting via `increment_balance` RPC
- `api/markets/cancel.ts`: refund all bets via `increment_balance` RPC
- `src/pages/CreateMarketPage.tsx`, `MarketDetailPage.tsx`, `ResolveMarketPage.tsx`: full UIs

### Phase 5 — Betting ✅
- `api/bets/place.ts`: validation, atomic `place_bet` RPC with fallback, returns bet + newBalance + updatedMarket
- MarketDetailPage: YES/NO buttons, amount input, payout preview, probability bar, target user warning

### Phase 6 — Token Economy ✅
- `api/cron/distribute.ts`: CRON_SECRET auth, ISO week idempotency, per-group distribution day

### Phase 7 — Leaderboard & Stats ✅
- `api/leaderboard.ts`: P/L ranking, win rate calculation
- `api/users/profile.ts`: user record, memberships, bet history with redaction, aggregate stats
- `src/pages/LeaderboardPage.tsx`, `ProfilePage.tsx`: full UIs

### Phase 8 — Frontend Design System ✅
- Design tokens in `src/index.css` using Tailwind v4 `@theme`
- CSS animations: fadeRise, confirmPulse, tick, probability-fill transition
- `src/components/AppLayout.tsx`: nav with links + UserButton
- All pages use consistent design: bg-surface cards, border-border, accent colors, font-mono for numbers

---

## Remaining Work

### Phase 1.2 — Apply migration to Supabase
- Run `supabase db push` against the target Supabase project
- Verify all tables, indexes, RLS policies, and RPC functions exist

### Phase 8 — Refinements
- Extract reusable components (`<Button>`, `<Card>`, `<StatusBadge>`, `<ProbabilityBar>`, `<TokenAmount>`, `<Countdown>`, `<Avatar>`, `<Toast>`)
- Mobile responsive nav (hamburger/bottom tab bar)

### Phase 9 — Hardening
- Error boundary wrapping the app
- 401 response interception → redirect to `/sign-in`
- Input validation (consider zod)
- Environment variable validation on serverless startup

---

## Key Technical Notes

- **Payout formula:** `floor(bet_amount / winning_side_pool × total_pool)` — rounding losses are acceptable
- **Probability display:** `P(YES) = yes_pool / total_pool`; default to 50/50 when `total_pool === 0`
- **Secret word redaction:** API layer strips `secret_word` when `requesting_user.id === market.target_user_id` (unless resolved)
- **Token distribution idempotency:** checks `token_distributions` for existing record within current ISO week
- **Race condition protection:** `place_bet` RPC uses `SELECT ... FOR UPDATE` on `group_members`
- **Lazy status transitions:** `GET /api/markets` and `GET /api/markets/[id]` auto-transition active markets past `window_end` to `pending_resolution`
