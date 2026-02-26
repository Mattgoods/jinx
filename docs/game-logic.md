# Game Logic

## Market Lifecycle State Machine

```
                    ┌──────────────┐
                    │   Created    │
                    │  (active)    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            │            ▼
      Bets placed          │     Creator cancels
      Time passes          │            │
              │            │            ▼
              │            │    ┌──────────────┐
              │            │    │  cancelled   │
              │            │    │ (refund all) │
              │            │    └──────────────┘
              │            │
              ▼            ▼
    ┌──────────────────────────┐
    │   window_end reached     │
    │  (pending_resolution)    │
    └────────────┬─────────────┘
                 │
          Creator resolves
                 │
         ┌───────┴───────┐
         ▼               ▼
  ┌─────────────┐ ┌─────────────┐
  │ resolved_yes│ │ resolved_no │
  │ (pay YES)   │ │ (pay NO)    │
  └─────────────┘ └─────────────┘
```

### Status Transitions

| From | To | Trigger |
|---|---|---|
| `active` | `pending_resolution` | Current time ≥ `window_end` (checked on access or via cron) |
| `active` | `cancelled` | Creator explicitly cancels |
| `pending_resolution` | `resolved_yes` | Creator resolves as YES |
| `pending_resolution` | `resolved_no` | Creator resolves as NO |
| `pending_resolution` | `cancelled` | Creator cancels (late cancel, full refund) |

**Note:** The transition from `active` → `pending_resolution` can happen lazily. When any API request touches this market and `window_end` has passed, the status is updated in place. Alternatively, a periodic cron could sweep for expired active markets.

---

## Probability Calculation

Probability is derived from the pool distribution:

```
P(YES) = yes_pool / (yes_pool + no_pool)
P(NO)  = no_pool  / (yes_pool + no_pool)
```

If `total_pool = 0`, display probability as 50% (the market opens at even odds with no bets placed).

**Example:**
- YES pool: 300 tokens, NO pool: 200 tokens
- P(YES) = 300 / 500 = 0.60 → display as "60%"
- P(NO) = 200 / 500 = 0.40 → display as "40%"

---

## Parimutuel Betting Model

All bets go into a single shared pool. There is no house edge — tokens transfer between players only. When the market resolves, the entire pool is distributed to the winning side proportionally.

### Payout Formula

When a market resolves (e.g., as YES):

```
For each winning bet (YES side):
  payout = (bet_amount / total_winning_pool) × total_pool
```

Where:
- `total_winning_pool` = sum of all bets on the winning side
- `total_pool` = sum of ALL bets (both sides)

Payouts are rounded down to the nearest integer. Any remainder due to rounding (at most a few tokens) is discarded (tokens vanish).

### Worked Example

**Market: "Will Jake say 'literally' at dinner Friday?"**

| Bettor | Side | Amount |
|---|---|---|
| Sarah | YES | 200 |
| Matt | YES | 100 |
| Alex | NO | 150 |
| Priya | NO | 50 |

**Pool totals:**
- YES pool: 300
- NO pool: 200
- Total pool: 500

**Displayed probability:** 60% YES / 40% NO

**Scenario A — Resolves YES (Jake said it):**

Winning side: YES (pool = 300, gets total pool of 500)

| Winner | Bet | Share of Winning Pool | Payout | Profit |
|---|---|---|---|---|
| Sarah | 200 | 200/300 = 66.7% | floor(500 × 0.667) = **333** | +133 |
| Matt | 100 | 100/300 = 33.3% | floor(500 × 0.333) = **166** | +66 |

Losers (Alex, Priya) get payout = 0.

Total distributed: 333 + 166 = 499 (1 token lost to rounding).

**Scenario B — Resolves NO (Jake did not say it):**

Winning side: NO (pool = 200, gets total pool of 500)

| Winner | Bet | Share of Winning Pool | Payout | Profit |
|---|---|---|---|---|
| Alex | 150 | 150/200 = 75% | floor(500 × 0.75) = **375** | +225 |
| Priya | 50 | 50/200 = 25% | floor(500 × 0.25) = **125** | +75 |

Total distributed: 375 + 125 = 500.

### Potential Payout Preview

Before placing a bet, the UI shows the user what they would win if their side wins, given the current pool state:

```
preview_payout = ((current_side_pool + bet_amount) > 0)
  ? floor(((bet_amount) / (current_side_pool + bet_amount)) × (total_pool + bet_amount))
  : bet_amount
```

This is an estimate — other bets placed after theirs will change the final payout.

---

## Edge Cases

### One-Sided Market (All Bets on Same Side)

If every bet is on YES and the market resolves YES, each bettor gets exactly their bet back (payout = amount, profit = 0). The same applies for all-NO markets resolving NO. There is no bonus — you need opposing bets to profit.

If every bet is on YES and the market resolves NO (losing side has 0 bets), there are no winners. All tokens in the pool are lost. The `payout` for every bet is set to `0`.

**Implementation:**
```
if (winning_pool == 0) {
  // No one bet on the winning side — all tokens are lost
  // Set all bets' payout to 0
} else if (losing_pool == 0) {
  // Everyone bet the same winning side — return bets
  // Set each bet's payout = bet amount (no profit)
}
```

### Zero Bets (Empty Market)

If a market reaches `window_end` with no bets placed (`total_pool = 0`), it can be resolved or cancelled with no payouts needed. Resolution sets status but distributes nothing.

### Cancelled Market

All bets are refunded in full. Each bet's `payout` is set to its `amount`, and each bettor's `token_balance` is credited back.

### User Bets on Both Sides

Allowed. A user can place multiple bets including on different sides. Each bet is resolved independently. If they bet 100 on YES and 50 on NO, and YES wins, they get their YES payout and lose their NO bet.

### Target User Attempts to Bet

Blocked at the API layer. The target of a market cannot place bets on that market. Return `FORBIDDEN`.

### Minimum Bet

The minimum bet is 1 token. There is no maximum bet beyond the user's balance.

### Market Creator Betting

The market creator CAN bet on their own market (they are not the target). They cannot bet if they are the target (which would mean they created a market targeting themselves — which is also blocked at creation time).

---

## Weekly Token Distribution

### Mechanism

A Vercel Cron job runs daily at 06:00 UTC. On each run:

1. Determine the current day of week (0 = Sunday, ..., 6 = Saturday) in UTC.
2. Query all groups where `token_distribution_day` = today.
3. For each matching group, query all `group_members`.
4. For each member, check if a `token_distributions` record exists where:
   - `group_id` matches
   - `user_id` matches
   - `distributed_at` falls within the current ISO week (Monday–Sunday)
5. If no record exists: insert into `token_distributions` and add `weekly_token_amount` to the member's `token_balance`.

### Duplicate Prevention

The `token_distributions` table acts as an idempotency log. Even if the cron fires multiple times on the same day (retries, redeployments), the weekly check prevents double distribution.

### Timing Behavior

- A user who joins a group on Tuesday (distribution day = Monday) will not receive tokens until the following Monday.
- Distribution day changes take effect on the next occurrence of the new day.
- The admin can change `weekly_token_amount` at any time. The new amount applies to the next distribution.

---

## Profit/Loss Calculation

Lifetime P/L for a user within a group:

```sql
SELECT
  COALESCE(SUM(payout - amount), 0) AS profit_loss
FROM bets b
JOIN markets m ON m.id = b.market_id
WHERE b.user_id = :userId
  AND m.group_id = :groupId
  AND b.payout IS NOT NULL;
```

- **Positive** profit/loss = net winner over time
- **Negative** profit/loss = net loser over time
- Only resolved bets count (where `payout IS NOT NULL`)
- Cancelled market bets have `payout = amount`, so profit = 0 (correctly neutral)

This is the ranking metric for the leaderboard.
