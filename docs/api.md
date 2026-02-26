# API Reference

## Conventions

All endpoints live under `/api/`. Every authenticated endpoint requires an `Authorization: Bearer <clerk_session_token>` header. The serverless function verifies this token via `@clerk/backend` and extracts the Clerk user ID.

### Standard Response Envelope

**Success:**
```json
{ "data": { ... } }
```

**Error:**
```json
{ "error": { "code": "INSUFFICIENT_BALANCE", "message": "Not enough tokens" } }
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid session token |
| `FORBIDDEN` | 403 | User lacks permission for this action |
| `NOT_FOUND` | 404 | Resource does not exist |
| `BAD_REQUEST` | 400 | Invalid input or failed validation |
| `INSUFFICIENT_BALANCE` | 400 | Token balance too low for bet |
| `MARKET_NOT_BETTABLE` | 400 | Market is not in `active` status |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Auth Verification Pattern

Every authenticated function starts with:

```typescript
import { verifyToken } from '@clerk/backend';

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });

  try {
    const { sub: clerkId } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    // Look up internal user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });

    // ... business logic using user.id
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}
```

---

## Endpoints

### Users

#### `POST /api/users/sync`

Syncs a Clerk user to the app database. Called after first sign-in to create the internal user record, and on subsequent sign-ins to update profile data.

**Auth:** Required

**Request Body:**
```json
{
  "displayName": "Matt G",
  "avatarUrl": "https://lh3.googleusercontent.com/..."
}
```

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "clerkId": "user_2x...",
    "displayName": "Matt G",
    "avatarUrl": "https://...",
    "createdAt": "2026-02-26T..."
  }
}
```

**Logic:** Upsert on `clerk_id`. If the user already exists, update `display_name` and `avatar_url`.

---

#### `GET /api/users/profile`

Returns the current user's profile, group memberships, and aggregate stats.

**Auth:** Required

**Response (200):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "displayName": "Matt G",
      "avatarUrl": "https://..."
    },
    "groups": [
      {
        "groupId": "uuid",
        "groupName": "The Boys",
        "tokenBalance": 750,
        "joinedAt": "2026-01-15T..."
      }
    ],
    "stats": {
      "totalBets": 42,
      "totalWins": 28,
      "totalLosses": 14,
      "lifetimeProfitLoss": 3200
    }
  }
}
```

**Logic:** Joins `users`, `group_members`, and aggregates from `bets` where `payout IS NOT NULL`.

---

### Groups

#### `POST /api/groups/create`

Creates a new group. The requesting user becomes the admin and first member.

**Auth:** Required

**Request Body:**
```json
{
  "name": "Friday Night Crew"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Friday Night Crew",
    "inviteCode": "aB3kZ9mX",
    "weeklyTokenAmount": 1000,
    "tokenDistributionDay": 1
  }
}
```

**Logic:**
1. Generate random 8-char alphanumeric invite code (retry on uniqueness collision).
2. Insert into `groups` with `admin_user_id` = requesting user.
3. Insert into `group_members` with `token_balance` = 0.

---

#### `POST /api/groups/join`

Joins an existing group via invite code.

**Auth:** Required

**Request Body:**
```json
{
  "inviteCode": "aB3kZ9mX"
}
```

**Response (200):**
```json
{
  "data": {
    "groupId": "uuid",
    "groupName": "Friday Night Crew",
    "tokenBalance": 0
  }
}
```

**Errors:**
- `NOT_FOUND` if invite code doesn't match any group.
- `BAD_REQUEST` if user is already a member.

---

#### `GET /api/groups/settings`

Returns group settings. Only accessible to the group admin.

**Auth:** Required  
**Query Params:** `groupId` (required)

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Friday Night Crew",
    "inviteCode": "aB3kZ9mX",
    "weeklyTokenAmount": 1000,
    "tokenDistributionDay": 1,
    "members": [
      { "userId": "uuid", "displayName": "Matt G", "tokenBalance": 750, "joinedAt": "..." },
      { "userId": "uuid", "displayName": "Jake", "tokenBalance": 1200, "joinedAt": "..." }
    ]
  }
}
```

---

#### `PUT /api/groups/settings`

Updates group settings. Admin only.

**Auth:** Required

**Request Body:**
```json
{
  "groupId": "uuid",
  "name": "Friday Night Crew (updated)",
  "weeklyTokenAmount": 1500,
  "tokenDistributionDay": 5,
  "regenerateInviteCode": true
}
```

All fields except `groupId` are optional — only provided fields are updated.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Friday Night Crew (updated)",
    "inviteCode": "nEw1cOdE",
    "weeklyTokenAmount": 1500,
    "tokenDistributionDay": 5
  }
}
```

---

#### `DELETE /api/groups/members`

Removes a member from the group. Admin only. Cannot remove self (admin).

**Auth:** Required

**Request Body:**
```json
{
  "groupId": "uuid",
  "userId": "uuid"
}
```

**Response (200):**
```json
{ "data": { "removed": true } }
```

**Logic:** Deletes from `group_members`. Any active bets by the removed user remain in the pool (no refunds).

---

### Markets

#### `GET /api/markets`

Lists markets for the user's group, filtered by status.

**Auth:** Required  
**Query Params:**
- `groupId` (required)
- `status` (optional): `active`, `pending_resolution`, `resolved_yes`, `resolved_no`, `cancelled`. Omit for all.

**Response (200):**
```json
{
  "data": {
    "markets": [
      {
        "id": "uuid",
        "targetUser": { "id": "uuid", "displayName": "Jake" },
        "creator": { "id": "uuid", "displayName": "Matt G" },
        "secretWord": "literally",
        "windowStart": "2026-03-01T18:00:00Z",
        "windowEnd": "2026-03-01T22:00:00Z",
        "status": "active",
        "totalPool": 500,
        "yesPool": 300,
        "noPool": 200,
        "probability": 0.6,
        "createdAt": "2026-02-28T..."
      }
    ]
  }
}
```

**Redaction logic:** If the requesting user's `id` matches `target_user_id`, the `secretWord` field is replaced with `null` in the response.

---

#### `POST /api/markets/create`

Creates a new market.

**Auth:** Required

**Request Body:**
```json
{
  "groupId": "uuid",
  "targetUserId": "uuid",
  "secretWord": "literally",
  "windowStart": "2026-03-01T18:00:00Z",
  "windowEnd": "2026-03-01T22:00:00Z"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "status": "active",
    "secretWord": "literally",
    "windowStart": "2026-03-01T18:00:00Z",
    "windowEnd": "2026-03-01T22:00:00Z"
  }
}
```

**Validations:**
- Creator must be a member of the group.
- Target user must be a member of the group.
- Creator cannot target themselves.
- `windowEnd` must be after `windowStart`.
- `windowStart` must be in the future (or within a small grace window).
- `secretWord` is trimmed and lowercased for storage.

---

#### `GET /api/markets/:id`

Returns full details for a single market, including all bets.

**Auth:** Required

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "targetUser": { "id": "uuid", "displayName": "Jake" },
    "creator": { "id": "uuid", "displayName": "Matt G" },
    "secretWord": "literally",
    "windowStart": "2026-03-01T18:00:00Z",
    "windowEnd": "2026-03-01T22:00:00Z",
    "status": "active",
    "totalPool": 500,
    "yesPool": 300,
    "noPool": 200,
    "probability": 0.6,
    "bets": [
      {
        "id": "uuid",
        "user": { "id": "uuid", "displayName": "Sarah" },
        "side": "yes",
        "amount": 200,
        "payout": null,
        "createdAt": "2026-02-28T..."
      }
    ],
    "userBets": [
      { "side": "yes", "amount": 100 }
    ],
    "resolvedAt": null,
    "createdAt": "2026-02-28T..."
  }
}
```

**Redaction:** If requesting user is the target, `secretWord` is `null` and individual bets may have limited visibility (hide bet sides to prevent word inference from betting patterns).

---

#### `POST /api/markets/resolve`

Resolves a market. Only the market creator can resolve, and only after the time window has closed.

**Auth:** Required

**Request Body:**
```json
{
  "marketId": "uuid",
  "resolution": "yes"
}
```

`resolution` must be `"yes"` or `"no"`.

**Response (200):**
```json
{
  "data": {
    "marketId": "uuid",
    "status": "resolved_yes",
    "resolvedAt": "2026-03-01T22:05:00Z",
    "payouts": [
      { "userId": "uuid", "displayName": "Sarah", "betAmount": 200, "payout": 333 },
      { "userId": "uuid", "displayName": "Matt G", "betAmount": 100, "payout": 167 }
    ]
  }
}
```

**Logic:**
1. Verify requesting user is the creator.
2. Verify `window_end` has passed.
3. Verify status is `active` or `pending_resolution`.
4. Calculate payouts using parimutuel formula (see `game-logic.md`).
5. In a transaction:
   - Update `markets.status` to `resolved_yes` or `resolved_no`, set `resolved_at`.
   - Update each winning bet's `payout` field.
   - Credit each winner's `group_members.token_balance`.
   - Set losing bets' `payout` to `0`.

---

#### `POST /api/markets/cancel`

Cancels a market. Only the creator can cancel. Refunds all bets.

**Auth:** Required

**Request Body:**
```json
{
  "marketId": "uuid"
}
```

**Response (200):**
```json
{
  "data": {
    "marketId": "uuid",
    "status": "cancelled",
    "refunds": [
      { "userId": "uuid", "amount": 200 },
      { "userId": "uuid", "amount": 100 }
    ]
  }
}
```

**Logic:** In a transaction: update status to `cancelled`, refund each bet amount back to the bettor's `token_balance`, set each bet's `payout` to the original `amount`.

---

### Bets

#### `POST /api/bets/place`

Places a bet on an active market.

**Auth:** Required

**Request Body:**
```json
{
  "marketId": "uuid",
  "side": "yes",
  "amount": 100
}
```

**Response (200):**
```json
{
  "data": {
    "bet": {
      "id": "uuid",
      "marketId": "uuid",
      "side": "yes",
      "amount": 100,
      "createdAt": "2026-02-28T..."
    },
    "newBalance": 650,
    "marketUpdate": {
      "totalPool": 600,
      "yesPool": 400,
      "noPool": 200,
      "probability": 0.667
    }
  }
}
```

**Validations:**
- Market status must be `active`.
- Current time must be before `window_end`.
- User must be a group member.
- User must NOT be the target of this market.
- `amount` > 0.
- User's `token_balance` >= `amount`.
- `side` must be `"yes"` or `"no"`.

**Transaction:**
1. Deduct `amount` from `group_members.token_balance`.
2. Insert into `bets`.
3. Increment `markets.yes_pool` or `markets.no_pool` by `amount`.
4. Increment `markets.total_pool` by `amount`.

---

### Leaderboard

#### `GET /api/leaderboard`

Returns the group leaderboard ranked by lifetime profit/loss.

**Auth:** Required  
**Query Params:** `groupId` (required)

**Response (200):**
```json
{
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "uuid",
        "displayName": "Sarah",
        "avatarUrl": "https://...",
        "profitLoss": 4500,
        "totalBets": 35,
        "winRate": 0.74
      },
      {
        "rank": 2,
        "userId": "uuid",
        "displayName": "Matt G",
        "avatarUrl": "https://...",
        "profitLoss": 3200,
        "totalBets": 42,
        "winRate": 0.67
      }
    ]
  }
}
```

**Logic:** For each group member, aggregate `SUM(payout - amount)` from resolved bets where `payout IS NOT NULL`. Order descending by profit/loss.

---

### Cron

#### `POST /api/cron/distribute`

Runs daily via Vercel Cron. Distributes weekly tokens to all members of groups where today matches `token_distribution_day`.

**Auth:** Vercel Cron secret (`Authorization: Bearer <CRON_SECRET>`)

**Logic:**
1. Get current day of week (UTC).
2. Select all groups where `token_distribution_day` = today's day.
3. For each group, select all members.
4. For each member, check if a `token_distributions` record exists for this group + user within the current calendar week.
5. If no distribution exists: insert a `token_distributions` record and increment `group_members.token_balance` by `groups.weekly_token_amount`.

**Response (200):**
```json
{
  "data": {
    "distributed": 3,
    "skipped": 0,
    "groups": ["uuid1", "uuid2", "uuid3"]
  }
}
```
