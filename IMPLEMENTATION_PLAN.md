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
- `supabase/migrations/001_initial_schema.sql` created with all 6 tables, indexes, RLS, RPCs

### Phase 2 — Authentication ✅
- ClerkProvider, RequireAuth, useApiClient with 401 interception, useUserSync, server-side auth verification

### Phase 3 — Groups ✅
- Create, join, settings, members, regenerate-invite APIs + frontend pages

### Phase 4 — Markets ✅
- Create, list (with status filter + lazy transitions), detail, resolve, cancel APIs + frontend pages

### Phase 5 — Betting ✅
- Atomic `place_bet` RPC with fallback, YES/NO UI, payout preview

### Phase 6 — Token Economy ✅
- Cron-based weekly distribution, idempotent per ISO week

### Phase 7 — Leaderboard & Stats ✅
- P/L ranking, win rate, profile with bet history

### Phase 8 — Frontend Design System ✅
- Design tokens in `src/index.css`, CSS animations, consistent dark theme

### Phase 8.1 — Reusable UI Component Library ✅
- Extracted 9 shared components to `src/components/ui/`:
  - `Button` (primary/danger/ghost variants, sm/md/lg sizes, renders as `<button>` or `<Link>`)
  - `Card` (rounded surface container with optional animation and padding sizes)
  - `FormField` (label + input/select with consistent styling, supports mono font)
  - `StatusBadge` (pill badge with auto-mapped colors for market statuses and bet sides)
  - `Avatar` (image with initial-letter fallback, sm/md/lg sizes)
  - `LoadingState` (centered loading text with customizable message)
  - `PageHeader` (h1 with tight tracking + optional right-side actions)
  - `TokenAmount` (mono-font amber token display)
  - `ProbabilityBar` (animated YES/NO fill bar with percentage labels)
- Barrel export via `src/components/ui/index.ts`
- All 10 existing pages updated to use shared components (reduced ~40% duplicated markup)
- 45 unit tests across 8 test files (all passing)
- `@testing-library/user-event` installed for user interaction testing

### Phase 8.2 — GroupDetailPage (Markets Browser) ✅
- **Problem:** No way to browse markets in a group. Users could create markets but had no list view.
- **Fix:** Created `GroupDetailPage` at `/group/:groupId` with:
  - Group header with action links (New Market, Leaderboard, Settings — admin-conditional)
  - Status filter tabs (All, Active, Pending, Resolved Yes/No, Cancelled)
  - Market cards with target name, secret word (or REDACTED), probability bar, pool total, creator, end date
  - Click-through to market detail page
- Dashboard group cards now link to GroupDetailPage as the primary navigation target

### Phase 8.3 — Mobile Responsive Nav ✅
- Hamburger menu icon (SVG) visible on small screens (`sm:hidden`)
- Desktop nav hidden on mobile, mobile menu slides in with nav links + UserButton
- Menu auto-closes on link click

### Phase 9 — Hardening (Partial) ✅
- Error boundary wrapping the entire app
- 401 response interception → auto sign-out + redirect

### Phase 9.1 — Input Validation & Environment Safety ✅
- **Problem:** API endpoints had inconsistent input validation — missing UUID format checks, no string length limits, no type coercion guards. Frontend forms relied almost entirely on HTML `required` with no inline error feedback.
- **Fix:** Full-stack input validation across all API endpoints and frontend forms:
  - **Shared server validation library** (`api/_lib/validation.ts`):
    - `validateUUID` — UUID v4 format check for all ID fields
    - `validateString` — required + min/max length (group names ≤100, secret words ≤50, display names ≤100)
    - `validatePositiveInt` — integer type + range (bet amounts 1–1M, weekly tokens 1–1M)
    - `validateDate` — ISO date string parsing with error-or-value return type
    - `validateEnum` — allowlist check for `side`, `outcome`, and `status` query params
    - `firstError` — collect multiple validation checks, return first failure
    - `requireEnvVars` — fail-fast on missing environment variables at module load
    - `MARKET_STATUSES` — typed constant for status filter query params
  - **All 12 API endpoints updated** with consistent validation:
    - `bets/place` — UUID marketId, enum side, positive int amount with max cap
    - `markets/create` — UUID groupId/targetUserId, string secretWord (≤50), dates parsed + validated
    - `markets/resolve` — UUID marketId, enum outcome
    - `markets/cancel` — UUID marketId
    - `markets/index` — UUID groupId, enum status filter
    - `markets/[id]` — UUID marketId
    - `groups/manage` (create) — string name (≤100 chars)
    - `groups/manage` (join) — alphanumeric invite code format check
    - `groups/manage` (members) — UUID userId + groupId
    - `groups/manage` (regenerate-invite) — UUID groupId
    - `groups/settings` — UUID groupId, name ≤100, weekly tokens 1–1M
    - `groups/[id]` — UUID groupId
    - `leaderboard` — UUID groupId
    - `users/index` (sync) — displayName trimmed + capped at 100, avatarUrl length-checked
  - **Environment variable validation:**
    - `CLERK_SECRET_KEY` validated at module load in `auth.ts` via `requireEnvVars`
    - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` already validated in `supabase.ts`
  - **Shared frontend validation library** (`src/lib/validation.ts`):
    - `validateRequired` — non-empty + max length
    - `validateAmount` — positive integer + optional max
    - `validateFutureDate` — valid date + future check
    - `validateDateRange` — end must be after start
    - `validateInviteCode` — alphanumeric format check
  - **5 frontend forms updated** with inline field-level error feedback:
    - `CreateMarketPage` — self-target check, secret word length, start/end date validation
    - `CreateGroupPage` — name required + max 100 chars
    - `JoinGroupPage` — alphanumeric invite code format
    - `GroupSettingsPage` — name required, weekly token amount range
    - `MarketDetailPage` (bet form) — integer check on bet amount

### Testing Infrastructure ✅
- Vitest configured with jsdom environment in `vite.config.ts`
- `@testing-library/react` + `@testing-library/jest-dom` installed
- Test setup with cleanup in `src/test/setup.ts`
- 75 tests for all UI components (10 test files, all passing)

### Bug Fix: Group Context Routing ✅
- All group-scoped pages use `:groupId` URL param with proper API calls

### Phase 10 — Toast Notifications ✅
- **Problem:** No visual feedback for user actions like bet placement, market creation/resolution, group creation/joining.
- **Fix:** Built a custom toast notification system with no external dependencies:
  - `ToastProvider` context wrapping the app, rendering toasts in a fixed bottom-right container
  - `useToast` hook returning `addToast(message, variant?)` for triggering toasts
  - Three variants: `success` (green), `error` (red), `info` (amber) matching the design system
  - Auto-dismiss after 4 seconds with slide-out exit animation
  - Manual dismiss via close button
  - Stacks multiple toasts vertically
  - Slide-in/slide-out CSS animations (`toastSlideIn`, `toastSlideOut` in `index.css`)
  - Split into `Toast.tsx` (component), `ToastContext.ts` (context), `useToast.ts` (hook) to satisfy react-refresh lint rule
- **Integrated into 7 pages:**
  - `MarketDetailPage` — bet placement confirmation
  - `CreateMarketPage` — market created
  - `ResolveMarketPage` — market resolved as YES/NO
  - `CreateGroupPage` — group created
  - `JoinGroupPage` — group joined
  - `GroupSettingsPage` — settings saved, invite code regenerated, member removed
- 10 unit tests covering rendering, variants, auto-dismiss, manual dismiss, error boundary, and positioning

### Phase 10.1 — Countdown Timer Component ✅
- **Problem:** Markets only showed "Ends [date]" or "Ended" text — no live countdown, no sense of urgency for active markets.
- **Fix:** Created `CountdownTimer` component in `src/components/ui/`:
  - Live countdown updating every second with auto-formatting: `2d 3h 15m` → `5h 30m 10s` → `45m 20s` → `30s`
  - Uses JetBrains Mono font for scoreboard feel (per spec 07)
  - Urgent pulse animation (`countdown-urgent` CSS class) activates when remaining time drops below threshold (default: 1 hour)
  - Urgent state shows red text with subtle tick animation
  - Configurable `label` prefix ("Ends in"), `expiredText` ("Ended"/"Window closed"), and `urgentThresholdMs`
  - Transitions cleanly to expired text when timer reaches zero
- **Integrated into 2 pages:**
  - `MarketDetailPage` — shows live countdown next to pool and creator info for active/pending markets
  - `GroupDetailPage` — replaces static date display on market cards with live countdown
- 14 unit tests covering time formatting (days/hours/minutes/seconds), urgent threshold, label display, custom expired text, live tick updates, and transition to expired state

### Phase 10.2 — Market Card Glow Effects ✅
- **Problem:** Market cards had no visual distinction between active and pending resolution states beyond the status badge text.
- **Fix:** Added soft box-shadow glow effects to market cards per spec 07:
  - `Card` component gained a `glow` prop accepting `'green'` or `'amber'` variants
  - CSS classes `glow-green` and `glow-amber` in `src/index.css` with layered translucent box-shadows
  - Green glow (active markets): `rgba(16, 185, 129)` — matches `--color-accent-green`
  - Amber glow (pending resolution markets): `rgba(245, 158, 11)` — matches `--color-accent-amber`
- **Integrated into 2 pages:**
  - `GroupDetailPage` — market list cards glow green when active, amber when pending resolution
  - `MarketDetailPage` — main market card glows based on status
- 6 new Card unit tests covering glow-green, glow-amber, and no-glow default (88 tests total across 11 test files, all passing)

### Phase 10.3 — Betting History Page ✅
- **Problem:** Users had no dedicated view to browse their full betting history across groups, filter by group, or see aggregate stats on their betting activity. The profile page showed a basic list but lacked filtering, potential payout info, and summary statistics.
- **Fix:** Added a fully featured Betting History page:
  - **API endpoint:** `GET /api/users/bets` (`?action=bets` on `users/index.ts`) — returns the user's full bet history with market details (target, secret word, status, pools), group info, and timestamps. Optional `?groupId=` query param filters to a single group. Verifies group membership when filtering. Redacts secret word for target users on unresolved markets. Also returns user's group list for the filter dropdown.
  - **Vercel rewrite:** `/api/users/bets` → `/api/users?action=bets` in `vercel.json` (no new function file — stays within 12-function Hobby plan limit)
  - **Frontend page:** `BettingHistoryPage` at `/bets` with:
    - Group filter dropdown (All Groups + each group the user belongs to)
    - Summary stats cards: Total Bets, Total Wagered, Net P/L, Win Rate
    - Bet list showing target name, secret word (or REDACTED), bet side badge, market status badge, group name, placed date, window end date
    - Wagered amount + resolved P/L (green/red) for settled bets, or potential payout for open bets
    - Each bet card links to the market detail page
    - Empty state when no bets exist
  - **Navigation:** "My Bets" link added to nav bar between Dashboard and Profile
  - **Route:** `/bets` added in `App.tsx` within the authenticated layout
  - 13 unit tests covering loading state, data rendering, empty state, summary stats, group filter interaction, secret word redaction, P/L display, potential payouts, status badges, link targets, and page title
  - Installed `@testing-library/user-event` as a dev dependency for testing select interactions

### Phase 11 — Stake.us Casino UI Revamp ✅
- **Problem:** The app used a generic dark theme with a simple top navigation bar. It lacked visual identity and didn't feel like a betting/casino platform.
- **Fix:** Complete UI overhaul inspired by stake.us (online casino), transforming the entire frontend into a sleek dark casino aesthetic:
  - **New design tokens** (`src/index.css`):
    - Primary background: `#0F212E` (dark teal-navy), surface: `#1A2C38`, hover: `#213743`
    - Accent green: `#00E701` (neon bright), red: `#ED4163`, amber: `#FFC107`, blue: `#1475E1`
    - Text: primary `#FFFFFF`, secondary `#B1BAD3`, tertiary `#557086`
    - New utility classes: `.casino-card` (hover lift), `.stat-card-*` (gradient stat cards), `.neon-green` (text glow), `.online-dot` (pulsing indicator), `.spinner` (loading animation), `.skeleton` (shimmer loading)
    - Custom scrollbar styling matching the dark theme
  - **Sidebar navigation** (`src/components/Sidebar.tsx`):
    - Left sidebar replacing top nav bar (stake.us-style)
    - Desktop: fixed 240px sidebar, always visible
    - Mobile: slide-over overlay with backdrop, triggered by hamburger button
    - Nav items: Dashboard, My Bets, Profile with SVG icons
    - Action items: Create Group, Join Group
    - Active link highlighting with green accent
    - "Jinx v1.0" footer with online-dot indicator
  - **AppLayout rewrite** (`src/components/AppLayout.tsx`):
    - Sticky top bar with backdrop blur, hamburger toggle (mobile), logo (mobile), group breadcrumb, token balance pill, UserButton
    - Main content offset for sidebar on desktop (`lg:pl-60`)
    - Auto-close mobile sidebar on route change
  - **UI component updates**:
    - `Button` — green glow shadow on primary, `bg-bg-surface` for ghost variant
    - `Card` — new `hover` prop for casino-card effect with cursor-pointer
    - `FormField` — dark input background (`bg-bg-input`), green focus ring
    - `StatusBadge` — accent-colored borders
    - `LoadingState` — spinner animation div + centered layout
    - `TokenAmount` — `toLocaleString()` number formatting, optional `showIcon` prop
    - `ProbabilityBar` — green glow shadow on fill bar
    - `PageHeader` — SVG chevron back arrow, green hover accent
    - `Avatar` — green accent ring on images, green fallback colors
    - `Toast` — variant-specific glow shadow effects
  - **Page rewrites** (all 14 pages updated):
    - `LandingPage` — casino-style hero with neon-green "Jinx" branding, feature cards, sticky header with Login/Register
    - `Dashboard` — "My Groups" card grid with group icons, online dots, hover effects
    - `GroupDetailPage` — stat cards bar (Members/Markets/Active), filter toolbar with SVG icons, 2-column market grid
    - `MarketDetailPage` — enhanced bet UI with glowing side selector buttons, payout preview card, bet list with hover
    - `LeaderboardPage` — rank medals, hover cards, empty state with SVG icon
    - `ProfilePage` — stat cards with gradient backgrounds, balance list with group icons, recent bets
    - `BettingHistoryPage` — stat cards (Total Bets/Wagered/P&L/Win Rate), enhanced bet cards
    - `CreateGroupPage`, `JoinGroupPage`, `CreateMarketPage` — wrapped forms in bordered cards with descriptive icons
    - `GroupSettingsPage` — updated form card, invite code with key icon, member list with hover
    - `ResolveMarketPage` — secret word in green, pool with coin icon, warning banner
    - `SignInPage`, `SignUpPage` — added Jinx branding header above Clerk components
    - `ErrorBoundary` — error icon in red circle, green glow button
  - **Test updates**: 2 test expectations updated to match new styling (ghost button `bg-bg-surface`, TokenAmount `toLocaleString` formatting)
  - All 88 tests passing, ESLint clean, TypeScript clean, build succeeds

---

## Remaining Work

### Phase 1.2 — Apply migration to Supabase
- Run `supabase db push` against the target Supabase project
- Verify all tables, indexes, RLS policies, and RPC functions exist

### Future Enhancements
- Token amounts count up/down with easing on bet placement and resolution (spec 07)

---

## Key Technical Notes

- **Payout formula:** `floor(bet_amount / winning_side_pool × total_pool)` — rounding losses are acceptable
- **Probability display:** `P(YES) = yes_pool / total_pool`; default to 50/50 when `total_pool === 0`
- **Secret word redaction:** API layer strips `secret_word` when `requesting_user.id === market.target_user_id` (unless resolved)
- **Token distribution idempotency:** checks `token_distributions` for existing record within current ISO week
- **Race condition protection:** `place_bet` RPC uses `SELECT ... FOR UPDATE` on `group_members`
- **Lazy status transitions:** `GET /api/markets` and `GET /api/markets/[id]` auto-transition active markets past `window_end` to `pending_resolution`
- **Group context routing:** All group-scoped pages use `:groupId` URL param. `api/groups/[id].ts` returns group detail + members for any group member. Settings/regenerate-invite APIs require explicit `groupId` param.
- **UI components:** All shared in `src/components/ui/` with barrel export. ESLint strict no-unused-vars means no `_` prefix destructuring — use object key filtering pattern instead. `Card` supports `glow` prop (`'green'` | `'amber'`) for status-based box-shadow effects.
- **Countdown timer:** `CountdownTimer` component accepts `targetDate` (ISO string), auto-updates every second. Applies `countdown-urgent` CSS class when remaining time < `urgentThresholdMs` (default 1h). Uses JetBrains Mono. Exported from barrel `src/components/ui/index.ts`.
- **Toast system:** `ToastProvider` wraps the app in `App.tsx`. Use `useToast()` hook to get `addToast(message, variant?)`. Files split across `Toast.tsx`, `ToastContext.ts`, `useToast.ts` to satisfy `react-refresh/only-export-components` lint rule.
- **Betting history:** `GET /api/users/bets` (dispatched via `?action=bets` on `users/index.ts`) returns full bet history with market + group details. Optional `?groupId=` filter. Rewrite in `vercel.json`. Frontend page at `/bets` with group filter dropdown, summary stats, and clickable bet cards linking to market detail.
- **Test setup:** Vitest + jsdom + @testing-library/react + @testing-library/user-event. Manual cleanup in `src/test/setup.ts` (`afterEach(cleanup)`). Avatar `alt=""` gives `presentation` role, use `container.querySelector('img')` to test.
- **Input validation:** Shared server-side validators in `api/_lib/validation.ts` (UUID, string length, positive int, date, enum). Shared frontend validators in `src/lib/validation.ts`. `FormField` component supports `error` prop for inline field-level errors. API endpoints use `firstError()` to collect multiple validation checks. `requireEnvVars()` validates env vars at module load time.
- **Casino UI theme:** Stake.us-inspired dark teal-navy palette (`#0F212E` bg, `#1A2C38` surface, `#00E701` neon green accent). Sidebar navigation replaces top nav bar (fixed on desktop, slide-over on mobile). `Card` supports `hover` prop for casino-card lift effect. `TokenAmount` uses `toLocaleString()` for comma-separated number formatting. All pages use `stat-card-*` gradient classes for stat displays. `AppLayout` uses `Promise.resolve().then()` pattern for setState-in-useEffect to satisfy `react-hooks/set-state-in-effect` lint rule.
