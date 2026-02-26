# Frontend Architecture

## Tech Stack

- **React 19** with **TypeScript**
- **Vite** for dev server and production builds
- **React Router v7** for client-side routing
- **Tailwind CSS v4** for styling
- **@clerk/clerk-react** for authentication
- **Inter** (Google Fonts) for UI text, **JetBrains Mono** for numeric/token displays

## Route Structure

```
/                        → LandingPage         (public)
/sign-in                 → ClerkSignIn          (public)
/sign-up                 → ClerkSignUp          (public)
/dashboard               → Dashboard            (protected)
/markets/new             → CreateMarket         (protected)
/markets/:id             → MarketDetail         (protected)
/markets/:id/resolve     → ResolveMarket        (protected)
/group/create            → CreateGroup          (protected)
/group/join              → JoinGroup            (protected)
/group/settings          → GroupSettings        (protected, admin only)
/leaderboard             → Leaderboard          (protected)
/profile                 → Profile              (protected)
/history                 → MarketHistory        (protected)
```

### Route Protection

All protected routes are wrapped in a `<RequireAuth>` component that uses Clerk's `useAuth()` hook. If the user is not signed in, they are redirected to `/sign-in`. If the user is signed in but has no group, they are redirected to `/group/create` or `/group/join`.

```tsx
// src/components/RequireAuth.tsx
function RequireAuth({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <LoadingSpinner />;
  if (!isSignedIn) return <Navigate to="/sign-in" />;
  return children;
}
```

## Component Hierarchy

```
App
├── ClerkProvider
│   ├── Router
│   │   ├── LandingPage
│   │   ├── SignInPage (Clerk <SignIn />)
│   │   ├── SignUpPage (Clerk <SignUp />)
│   │   │
│   │   └── RequireAuth
│   │       ├── GroupGate (redirects if no group)
│   │       │   ├── AppLayout
│   │       │   │   ├── Navbar
│   │       │   │   │   ├── Logo
│   │       │   │   │   ├── NavLinks
│   │       │   │   │   ├── TokenBalancePill
│   │       │   │   │   └── UserButton (Clerk)
│   │       │   │   │
│   │       │   │   ├── Dashboard
│   │       │   │   │   ├── ActiveMarketsFeed
│   │       │   │   │   │   └── MarketCard (repeated)
│   │       │   │   │   ├── QuickActions
│   │       │   │   │   └── PendingResolutionBanner
│   │       │   │   │
│   │       │   │   ├── CreateMarket
│   │       │   │   │   ├── TargetUserSelect
│   │       │   │   │   ├── SecretWordInput
│   │       │   │   │   └── TimeWindowPicker
│   │       │   │   │
│   │       │   │   ├── MarketDetail
│   │       │   │   │   ├── MarketHeader (word redacted if target)
│   │       │   │   │   ├── ProbabilityBar
│   │       │   │   │   ├── BetPanel
│   │       │   │   │   │   ├── BetAmountInput
│   │       │   │   │   │   ├── YesButton / NoButton
│   │       │   │   │   │   └── PotentialPayoutPreview
│   │       │   │   │   ├── BetList
│   │       │   │   │   └── CountdownTimer
│   │       │   │   │
│   │       │   │   ├── ResolveMarket
│   │       │   │   │   ├── MarketSummary
│   │       │   │   │   └── ResolutionButtons (Yes / No)
│   │       │   │   │
│   │       │   │   ├── Leaderboard
│   │       │   │   │   └── LeaderboardRow (repeated)
│   │       │   │   │
│   │       │   │   ├── Profile
│   │       │   │   │   ├── BalanceCard
│   │       │   │   │   ├── BetHistoryTable
│   │       │   │   │   └── StatsOverview
│   │       │   │   │
│   │       │   │   ├── MarketHistory
│   │       │   │   │   └── ResolvedMarketCard (repeated)
│   │       │   │   │
│   │       │   │   └── GroupSettings (admin)
│   │       │   │       ├── GroupNameInput
│   │       │   │       ├── TokenAllowanceInput
│   │       │   │       ├── DistributionDaySelect
│   │       │   │       ├── InviteCodeDisplay
│   │       │   │       └── MemberList
│   │       │   │
│   │       │   └── CreateGroup / JoinGroup
│   │       │
│   │       └── ToastProvider
```

## State Management

No global state library. State is managed with:

1. **Clerk** for auth state (`useAuth`, `useUser`).
2. **React Router loaders** (v7) for route-level data fetching where appropriate.
3. **`useState` / `useReducer`** for local component state.
4. **Custom hooks** for shared data-fetching patterns.

### Key Custom Hooks

```typescript
// Fetches with auth token automatically attached
function useApi<T>(path: string, options?: RequestInit): {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => void;
}

// Current user's active group context
function useGroup(): {
  group: Group | null;
  membership: GroupMember | null;
  isAdmin: boolean;
  switchGroup: (groupId: string) => void;
}

// Token balance with optimistic updates
function useBalance(): {
  balance: number;
  deduct: (amount: number) => void;  // optimistic
  refetch: () => void;
}

// Market data with polling for active markets
function useMarket(marketId: string): {
  market: Market | null;
  bets: Bet[];
  isTarget: boolean;
  refetch: () => void;
}
```

### API Client

A thin wrapper around `fetch` that auto-attaches the Clerk session token:

```typescript
// src/lib/api.ts
import { useAuth } from '@clerk/clerk-react';

export function useApiClient() {
  const { getToken } = useAuth();

  return async (path: string, options: RequestInit = {}) => {
    const token = await getToken();
    const res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Request failed');
    }
    return res.json();
  };
}
```

## Clerk Integration Points

| Component/Hook | Clerk Usage |
|---|---|
| `App` root | `<ClerkProvider publishableKey={...}>` wrapping the entire app |
| `/sign-in` | `<SignIn routing="path" path="/sign-in" />` |
| `/sign-up` | `<SignUp routing="path" path="/sign-up" />` |
| `RequireAuth` | `useAuth()` → `isSignedIn` check |
| `Navbar` | `<UserButton />` for avatar/dropdown/sign-out |
| `useApiClient` | `useAuth()` → `getToken()` for API calls |
| Post-sign-up | Call `POST /api/users/sync` with Clerk profile data |

---

## Design System

### Colors (Tailwind Config)

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0F1117',
          surface: '#1A1D27',
          hover: '#242836',
        },
        border: '#2A2E3B',
        accent: {
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
        },
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          tertiary: '#64748B',
        },
      },
    },
  },
};
```

### Token Mapping

| Token | Hex | Usage |
|---|---|---|
| `bg-primary` | `#0F1117` | Page background |
| `bg-surface` | `#1A1D27` | Cards, panels, modals |
| `bg-hover` | `#242836` | Hover states on surfaces |
| `border` | `#2A2E3B` | Borders, dividers |
| `accent-green` | `#10B981` | YES bets, wins, primary CTAs, positive states |
| `accent-amber` | `#F59E0B` | Token amounts, highlights, pending states |
| `accent-red` | `#EF4444` | NO bets, losses, destructive actions, danger |
| `text-primary` | `#F1F5F9` | Headlines, primary body text |
| `text-secondary` | `#94A3B8` | Supporting text, labels |
| `text-tertiary` | `#64748B` | Timestamps, metadata, placeholders |

### Typography

**Font loading (index.html):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

**Tailwind config:**
```typescript
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

| Element | Font | Weight | Size | Letter Spacing |
|---|---|---|---|---|
| Page title (h1) | Inter | 700 (bold) | 2rem / 32px | -0.02em |
| Section heading (h2) | Inter | 600 (semibold) | 1.5rem / 24px | -0.02em |
| Card heading (h3) | Inter | 600 | 1.125rem / 18px | -0.01em |
| Body | Inter | 400 (regular) | 1rem / 16px | normal |
| Small / meta | Inter | 400 | 0.875rem / 14px | normal |
| Token amounts | JetBrains Mono | 600 | varies | normal |
| Probability % | JetBrains Mono | 500 | 1.5rem+ | normal |
| Countdown timer | JetBrains Mono | 400 | 1rem | 0.05em |

### Animations

All animations use CSS transitions or Tailwind's built-in animation utilities. Keep motion minimal and meaningful.

**Probability Bar:**
```css
.probability-fill {
  transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Token Counter (count-up/down):**
Use a lightweight animation via `requestAnimationFrame` or a utility like `CountUp.js`. Easing: ease-out over 400ms.

**Card Entrance:**
```css
.card-enter {
  animation: fadeRise 300ms ease-out forwards;
}
@keyframes fadeRise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Bet Confirmation:**
```css
.bet-confirm {
  animation: confirmPulse 400ms ease-out;
}
@keyframes confirmPulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 16px 4px rgba(16, 185, 129, 0.2); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
```

**Countdown Pulse (final 60 seconds):**
```css
.countdown-urgent {
  animation: tick 1s ease-in-out infinite;
}
@keyframes tick {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### Component Patterns

**MarketCard:**
- Background: `bg-surface` with rounded corners (`rounded-xl`)
- Border: 1px `border` color
- Active markets: subtle green glow → `shadow-[0_0_12px_rgba(16,185,129,0.15)]`
- Pending resolution: subtle amber glow → `shadow-[0_0_12px_rgba(245,158,11,0.15)]`
- Hover: background shifts to `bg-hover`

**Status Badges:**
- Pill-shaped: `rounded-full px-3 py-1 text-xs font-medium`
- Active: `bg-accent-green/15 text-accent-green`
- Pending: `bg-accent-amber/15 text-accent-amber`
- Resolved YES: `bg-accent-green/15 text-accent-green`
- Resolved NO: `bg-accent-red/15 text-accent-red`
- Cancelled: `bg-border text-text-tertiary`

**ProbabilityBar:**
- Full-width container with `bg-accent-red/20` background (NO side implied)
- Green fill (`bg-accent-green`) width = `{probability * 100}%`
- Height: 8px, `rounded-full`
- Percentage label centered or beside the bar in `font-mono`

**Buttons:**
- Primary (green): `bg-accent-green hover:bg-accent-green/90 text-white font-semibold rounded-lg px-4 py-2`
- Danger (red): `bg-accent-red hover:bg-accent-red/90 text-white`
- Ghost: `bg-transparent border border-border text-text-secondary hover:bg-hover`

**Toast Notifications:**
- Slide in from top-right
- Auto-dismiss after 4 seconds
- Success: left border accent-green
- Error: left border accent-red
- Info: left border accent-amber
