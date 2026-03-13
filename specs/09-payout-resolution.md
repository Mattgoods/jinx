# 09 — Atomic Payout Resolution

## Topic
Atomic payout distribution when a market resolves, ensuring market status updates, bet payout writes, and winner balance credits all happen in a single database transaction.

## Acceptance Criteria

- Market resolution and payout distribution MUST happen atomically in a single PostgreSQL transaction
- A new PostgreSQL RPC function `resolve_market(p_market_id UUID, p_outcome TEXT)` handles the entire resolution flow within a single transaction:
  - (a) Verify the market is in `active` or `pending_resolution` status
  - (b) Verify the time window has closed (`window_end < now()`)
  - (c) Update the market status to `resolved_yes` or `resolved_no` and set `resolved_at` timestamp
  - (d) Calculate each winning bet's payout using `floor(bet_amount / winning_side_pool * total_pool)`
  - (e) Set each winning bet's `payout` column to its calculated payout
  - (f) Set each losing bet's `payout` column to `0` (not left as NULL)
  - (g) Credit each winner's `group_members.token_balance` via direct UPDATE
  - All steps roll back entirely on any failure — no partial payouts, no orphaned status changes
- The `resolve.ts` API endpoint calls this single RPC instead of performing multiple separate DB calls
- The API endpoint still handles auth (Clerk token verification) and authorization (only the market creator can resolve) before calling the RPC
- If the RPC raises an exception, the entire operation rolls back — the market remains in its pre-resolution status and no balances change
- Losers have their `payout` column set to `0` (not left as NULL)
- The RPC function validates that the market is resolvable (correct status, window closed) to prevent double-resolution even under race conditions

## Correct Behavior

- Market with YES pool=300, NO pool=200, total=500 resolves YES → each YES bettor gets `floor(their_bet / 300 * 500)` credited atomically
- If any step fails, the market remains in its pre-resolution status and no balances change
- Empty market (0 bets) → status updates to resolved, no payout operations needed
- All existing payout rules from spec 04 continue to hold: proportional payouts, floor rounding, rounding losses discarded

## Incorrect Behavior (Current)

- Market status changes to `resolved_yes` but some or all winners never receive tokens
- Partial payouts where some winners are credited and others are not
- Losers' `payout` column left as NULL instead of `0`

## Edge Cases

- Double-resolution attempt (two simultaneous resolve calls) — only one succeeds, the second gets an error because the market is no longer in a resolvable status
- Market with 0 bets — resolves cleanly with no payout operations
- One-sided market (all bets on winning side) — everyone gets their bet back
- One-sided market (all bets on losing side) — all tokens lost, losers get `payout=0`
- Very large number of bets — transaction should still complete atomically
