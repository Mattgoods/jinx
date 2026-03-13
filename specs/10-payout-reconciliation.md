# 10 — Reconcile Pre-Fix Missing Payouts

## Topic
One-time reconciliation of missed payouts for markets that were resolved before the atomic `resolve_market` RPC (Task 12.1) was deployed. The old non-atomic resolution flow could fail partway through, leaving markets in a resolved status with winning bets that never received payouts and winners whose balances were never credited.

## Acceptance Criteria

- A new SQL migration file `supabase/migrations/003_reconcile_payouts.sql` runs as a one-time data fix
- The migration detects all affected markets: status IN (`resolved_yes`, `resolved_no`) AND there exist bets on the winning side with `payout IS NULL`
- For each affected market, payouts are calculated using the same formula as `resolve_market`: `floor(bet_amount::numeric / winning_pool * total_pool)` where `total_pool = yes_pool + no_pool` and `winning_pool` is the pool matching the resolved outcome
- Each winning bet's `payout` column is updated with the calculated amount
- Each winner's `group_members.token_balance` is credited by adding the payout amount
- All remaining bets with `payout IS NULL` (losing side) are set to `payout = 0`
- After the migration runs, every bet on every resolved market has a non-NULL `payout` value
- Winners' `group_members.token_balance` reflects the correct cumulative payout credits
- The migration is idempotent — running it a second time produces no changes (only processes bets where `payout IS NULL`)
- The same payout formula is used as in `resolve_market` RPC — results are identical to what would have happened if the fix had been in place at resolution time
- The migration logs output via `RAISE NOTICE` showing how many markets and bets were reconciled

## Correct Behavior

- Every bet on every resolved market has a non-NULL `payout` value
- Winners' balances have been credited with the correct payout amounts
- Losing bets have `payout = 0` (not NULL)
- The migration is safe to run multiple times without side effects — a second run processes zero records
- A market with YES pool=300, NO pool=200, total=500 that resolved YES → each YES bettor with a NULL payout gets `floor(their_bet / 300 * 500)` credited to their balance

## Incorrect Behavior (What We're Fixing)

- Resolved markets exist where winning bettors never received token credits
- `bets.payout` is NULL for bets on resolved markets
- `group_members.token_balance` is lower than it should be for affected winners
- Losing bets have `payout` left as NULL instead of `0`

## Edge Cases

- Markets with 0 bets — no payout operations needed, should not cause errors
- One-sided markets where winning pool = 0 (all bets on losing side) — all bets get `payout = 0`, no balance credits
- Partial failure scenario: some bets on a market were paid out (have non-NULL payout) but others were not — only the NULL-payout bets are processed, already-paid bets are untouched
- Markets that were resolved correctly after Task 12.1 — all their bets already have non-NULL payouts, so the migration skips them entirely
- Running the migration twice — the second run detects zero NULL-payout bets and makes no changes
- A winner who bet on multiple affected markets — each payout credited independently, cumulative balance is correct
