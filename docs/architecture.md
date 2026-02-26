# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel                           │
│                                                         │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │   React SPA (Vite)   │  │  Serverless Functions    │  │
│  │                      │  │  /api/*                  │  │
│  │  - React Router v7   │  │                          │  │
│  │  - Clerk React SDK   │──▶  - Clerk Node SDK        │  │
│  │  - Tailwind CSS v4   │  │  - Supabase JS Client    │  │
│  │  - TypeScript         │  │  - TypeScript            │  │
│  └──────────┬───────────┘  └────────┬────────────────┘  │
│             │                       │                    │
└─────────────┼───────────────────────┼────────────────────┘
              │                       │
              │ Session Token         │ Service Role Key
              ▼                       ▼
     ┌────────────────┐     ┌─────────────────┐
     │     Clerk      │     │    Supabase      │
     │                │     │                  │
     │ - Google OAuth │     │ - PostgreSQL DB  │
     │ - Session Mgmt │     │ - Row Level Sec  │
     │ - User Profiles│     │ - Realtime (fut) │
     └────────────────┘     └─────────────────┘
```

## Component Responsibilities

### Frontend (React SPA)

Single-page application deployed as static assets on Vercel. Handles all UI rendering, client-side routing, and auth state via Clerk's React SDK. Communicates with the backend exclusively through `/api/*` fetch calls, passing the Clerk session token in the `Authorization` header.

**Key dependencies:**
- `react` / `react-dom` v19
- `react-router` v7 (client-side routing)
- `@clerk/clerk-react` (auth context, `<SignIn>`, `<SignUp>`, `<UserButton>`, `useAuth`, `useUser`)
- `tailwindcss` v4 (utility-first styling)
- `vite` (dev server + build)

### Serverless Functions (Vercel Functions)

Each file in `/api` becomes an HTTP endpoint. Functions handle all business logic: auth verification, database reads/writes, bet placement, market resolution, token distribution. Every function follows the same pattern:

1. Verify Clerk session token → extract `userId`
2. Look up internal `users.id` from `clerk_id`
3. Execute business logic against Supabase
4. Return JSON response

**Key dependencies:**
- `@clerk/backend` (session token verification)
- `@supabase/supabase-js` (database client, initialized with service role key)

### Supabase (PostgreSQL)

Hosts the entire data layer. Accessed from serverless functions using the **service role key** (bypasses RLS) for write operations and trusted server-side reads. RLS policies exist as a defense-in-depth layer but are not the primary auth gating mechanism.

### Clerk

Handles all authentication. Users sign in with Google OAuth only — no email/password. Clerk manages session tokens, user metadata (name, avatar), and provides SDKs for both frontend and backend verification.

## Request Flow

### Authenticated API Request

```
Browser                    Vercel Function           Clerk           Supabase
   │                            │                     │                │
   │  GET /api/markets          │                     │                │
   │  Authorization: Bearer xxx │                     │                │
   │───────────────────────────▶│                     │                │
   │                            │  verifyToken(xxx)   │                │
   │                            │────────────────────▶│                │
   │                            │  { userId: "ck_*" } │                │
   │                            │◀────────────────────│                │
   │                            │                     │                │
   │                            │  SELECT * FROM ...  │                │
   │                            │─────────────────────────────────────▶│
   │                            │  [rows]             │                │
   │                            │◀─────────────────────────────────────│
   │                            │                     │                │
   │  200 { markets: [...] }    │                     │                │
   │◀───────────────────────────│                     │                │
```

### Bet Placement (Write Path)

```
Browser                    Vercel Function                    Supabase
   │                            │                                │
   │  POST /api/bets            │                                │
   │  { marketId, side, amount }│                                │
   │───────────────────────────▶│                                │
   │                            │  1. Verify Clerk session       │
   │                            │  2. Look up user + membership  │
   │                            │─────────────────────────────  ▶│
   │                            │  3. Validate: balance, market  │
   │                            │     status, not target user    │
   │                            │  4. BEGIN transaction:         │
   │                            │     - INSERT bet               │
   │                            │     - UPDATE group_members     │
   │                            │       SET token_balance -= amt │
   │                            │     - UPDATE markets           │
   │                            │       SET yes/no_pool += amt,  │
   │                            │       total_pool += amt        │
   │                            │  5. COMMIT                     │
   │                            │─────────────────────────────  ▶│
   │                            │                                │
   │  200 { bet, newBalance }   │                                │
   │◀───────────────────────────│                                │
```

## Deployment Topology

Everything deploys to **Vercel** from a single GitHub repository:

```
project-root/
├── src/                    # React app source
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   └── main.tsx
├── api/                    # Vercel serverless functions
│   ├── markets/
│   │   ├── index.ts        → GET  /api/markets
│   │   ├── create.ts       → POST /api/markets/create
│   │   ├── [id].ts         → GET  /api/markets/:id
│   │   └── resolve.ts      → POST /api/markets/resolve
│   ├── bets/
│   │   └── place.ts        → POST /api/bets/place
│   ├── groups/
│   │   ├── create.ts       → POST /api/groups/create
│   │   ├── join.ts         → POST /api/groups/join
│   │   └── settings.ts     → GET/PUT /api/groups/settings
│   ├── users/
│   │   ├── sync.ts         → POST /api/users/sync
│   │   └── profile.ts      → GET  /api/users/profile
│   ├── leaderboard.ts      → GET  /api/leaderboard
│   └── cron/
│       └── distribute.ts   → Vercel Cron: token distribution
├── docs/                   # This documentation
├── public/
├── vite.config.ts
├── vercel.json
├── tailwind.config.ts
└── package.json
```

### Vercel Configuration (`vercel.json`)

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "crons": [
    {
      "path": "/api/cron/distribute",
      "schedule": "0 6 * * *"
    }
  ]
}
```

The SPA catch-all rewrite ensures React Router handles all non-API routes. The cron job runs daily at 6 AM UTC to check if token distribution is due.

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend | Clerk React SDK initialization |
| `CLERK_SECRET_KEY` | Serverless functions | Backend session verification |
| `SUPABASE_URL` | Serverless functions | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Serverless functions | Full DB access (bypasses RLS) |
| `CRON_SECRET` | Serverless functions | Secures the cron endpoint |

## Future Considerations

- **Supabase Realtime:** Subscribe to `markets` table changes on the market detail page for live probability updates without polling.
- **Edge Functions:** If latency becomes an issue, migrate hot-path functions (bet placement) to Vercel Edge Runtime.
- **Rate Limiting:** Add rate limiting middleware to bet placement and market creation endpoints to prevent abuse.
