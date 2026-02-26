# Data Model

## Schema Overview

All tables live in the `public` schema in Supabase (PostgreSQL). UUIDs are generated via `gen_random_uuid()`. Timestamps default to `now()` and are stored as `timestamptz`.

## Custom Types

```sql
CREATE TYPE market_status AS ENUM (
  'active',
  'pending_resolution',
  'resolved_yes',
  'resolved_no',
  'cancelled'
);

CREATE TYPE bet_side AS ENUM ('yes', 'no');
```

## Tables

### users

Stores application user records linked to Clerk identities.

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_clerk_id ON users (clerk_id);
```

**Notes:**
- `clerk_id` is the Clerk user ID (e.g., `user_2x...`). This is the join key between Clerk and the app DB.
- `display_name` is set by the user during onboarding and can be updated later.
- `avatar_url` is pulled from the Google OAuth profile during sync.

---

### groups

Each group is an independent prediction market community.

```sql
CREATE TABLE groups (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  invite_code             TEXT NOT NULL UNIQUE,
  admin_user_id           UUID NOT NULL REFERENCES users(id),
  weekly_token_amount     INTEGER NOT NULL DEFAULT 1000,
  token_distribution_day  INTEGER NOT NULL DEFAULT 1 CHECK (token_distribution_day BETWEEN 0 AND 6),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_invite_code ON groups (invite_code);
```

**Notes:**
- `invite_code` is a short random alphanumeric string (e.g., 8 chars). Must be unique across all groups.
- `token_distribution_day`: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
- `weekly_token_amount` is the number of tokens each member receives per distribution cycle.
- The admin is the user who created the group. Admin privileges: change settings, regenerate/revoke invite codes, remove members.

---

### group_members

Junction table linking users to groups with per-group token balance.

```sql
CREATE TABLE group_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_balance INTEGER NOT NULL DEFAULT 0,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members (group_id);
CREATE INDEX idx_group_members_user_id ON group_members (user_id);
```

**Notes:**
- `token_balance` is the user's spendable balance within this specific group. It can never go negative (enforced at the application layer).
- A user can be a member of multiple groups, each with independent balances.
- When a user joins a group, they start with `0` tokens. They receive their first allocation on the next distribution cycle.

---

### markets

A single prediction market: "Will [target] say [word] during [time window]?"

```sql
CREATE TABLE markets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES users(id),
  target_user_id  UUID NOT NULL REFERENCES users(id),
  secret_word     TEXT NOT NULL,
  window_start    TIMESTAMPTZ NOT NULL,
  window_end      TIMESTAMPTZ NOT NULL,
  status          market_status NOT NULL DEFAULT 'active',
  resolved_at     TIMESTAMPTZ,
  total_pool      INTEGER NOT NULL DEFAULT 0,
  yes_pool        INTEGER NOT NULL DEFAULT 0,
  no_pool         INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (window_end > window_start),
  CHECK (total_pool >= 0),
  CHECK (yes_pool >= 0),
  CHECK (no_pool >= 0),
  CHECK (yes_pool + no_pool = total_pool)
);

CREATE INDEX idx_markets_group_id ON markets (group_id);
CREATE INDEX idx_markets_status ON markets (status);
CREATE INDEX idx_markets_group_status ON markets (group_id, status);
CREATE INDEX idx_markets_target_user_id ON markets (target_user_id);
CREATE INDEX idx_markets_creator_id ON markets (creator_id);
```

**Notes:**
- `secret_word` is stored in plaintext. Redaction is handled at the API layer — the serverless function strips this field from the response when the requesting user is the target.
- `yes_pool` and `no_pool` are denormalized counters updated on every bet placement. This avoids aggregation queries on the `bets` table for probability display.
- `total_pool = yes_pool + no_pool` is enforced by a CHECK constraint.
- `status` transitions: `active` → `pending_resolution` → `resolved_yes` | `resolved_no`. At any point before resolution, the creator can set `cancelled`.

---

### bets

Individual bet records.

```sql
CREATE TABLE bets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id   UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  side        bet_side NOT NULL,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  payout      INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bets_market_id ON bets (market_id);
CREATE INDEX idx_bets_user_id ON bets (user_id);
CREATE INDEX idx_bets_market_user ON bets (market_id, user_id);
```

**Notes:**
- A user can place multiple bets on the same market, even on different sides.
- `payout` is `NULL` until the market resolves. On resolution, it is set to the calculated payout amount (0 for losers, proportional share for winners).
- `amount` must be positive — validated by CHECK constraint and application logic.

---

### token_distributions

Audit log of weekly token distributions.

```sql
CREATE TABLE token_distributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  amount          INTEGER NOT NULL,
  distributed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_distributions_group_id ON token_distributions (group_id);
CREATE INDEX idx_token_distributions_distributed_at ON token_distributions (distributed_at);
```

**Notes:**
- One row per user per distribution event.
- Used to prevent double-distribution: before distributing, check if a distribution already exists for this group + user in the current week.

---

## Row Level Security Policies

RLS is enabled on all tables as a defense-in-depth layer. Since serverless functions use the **service role key** (which bypasses RLS), these policies primarily guard against accidental direct client access or future Supabase Realtime subscriptions.

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_distributions ENABLE ROW LEVEL SECURITY;

-- users: can read own record
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (clerk_id = auth.jwt() ->> 'sub');

-- group_members: can read memberships for groups you belong to
CREATE POLICY "Members can read group memberships"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT gm.group_id FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE u.clerk_id = auth.jwt() ->> 'sub'
    )
  );

-- markets: group members can read markets in their groups
CREATE POLICY "Members can read group markets"
  ON markets FOR SELECT
  USING (
    group_id IN (
      SELECT gm.group_id FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE u.clerk_id = auth.jwt() ->> 'sub'
    )
  );

-- bets: users can read own bets
CREATE POLICY "Users can read own bets"
  ON bets FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  );

-- token_distributions: users can read own distributions
CREATE POLICY "Users can read own distributions"
  ON token_distributions FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  );
```

**Important:** All write operations go through serverless functions using the service role key. RLS INSERT/UPDATE/DELETE policies are intentionally omitted — writes are never performed directly from the client.

---

## Migration File

Save as `supabase/migrations/001_initial_schema.sql` and apply via Supabase CLI:

```bash
supabase db push
```

The full migration is the concatenation of all the SQL blocks above in order: types → tables → indexes → RLS policies.
