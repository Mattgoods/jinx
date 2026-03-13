# 11 — Fix resolve_market RPC for One-Sided Markets

## Topic
Diagnosing and fixing the `resolve_market` RPC to correctly handle one-sided markets (all bets on the same side) and sole-bettor scenarios, plus running a reconciliation migration to credit already-affected users whose payouts were silently dropped.

## Acceptance Criteria

### Diagnostic: Version-Control the Current RPC
- The current `resolve_market` RPC source MUST be extracted from Supabase (via `\sf public.resolve_market` in the SQL editor or `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'resolve_market'`) and committed to a migration file in `supabase/migrations/` so the implementation is version-controlled and auditable
- The extracted source serves as the baseline for identifying the bug before any fix is applied

### RPC Bug Fix: One-Sided Market Edge Cases
- The `resolve_market` RPC MUST correctly handle all combinations of pool state and outcome:
  - **One-sided market, winning side (losing pool = 0):** Every bettor on the winning side receives exactly their bet back (`payout = amount`). Balance is credited.
  - **One-sided market, losing side (winning pool = 0):** All bets get `payout = 0`. No balance credits issued.
  - **Sole bettor who wins:** Gets their full bet back (`payout = total_pool`, since they are 100% of the winning pool). Balance is credited.
  - **Sole bettor who loses:** Gets `payout = 0`. No balance credit.
  - **Market with 0 bets:** Status updates to resolved, no payout operations needed, no errors raised.
- The `winning_pool` and `losing_pool` calculations MUST NOT cause division-by-zero — when `winning_pool = total_pool` (no losing bets), each winner's payout is their bet amount; when `winning_pool = 0` (no winning bets), all payouts are 0
- The payout formula `floor(bet_amount::numeric / winning_pool * total_pool)` MUST be guarded: if `winning_pool = 0`, skip the division and set all payouts to 0; if `losing_pool = 0`, set each winner's payout to their bet amount directly
- Balance credits MUST correctly JOIN `bets` to `group_members` using BOTH `user_id` AND `group_id` (derived from the market's group via `markets.group_id`) — a JOIN on `user_id` alone would credit the wrong group's balance for users in multiple groups
- The NO outcome path MUST work identically to YES — the only difference is which side (`yes` vs `no`) is considered the winning side
- Losing bets MUST have `payout` set to `0` (not left as NULL) in all scenarios

### Reconciliation Migration
- A new idempotent migration `supabase/migrations/008_reconcile_one_sided_payouts.sql` MUST be created (or the existing `004_reconcile_payouts.sql` updated and re-run) to fix already-affected data
- The migration finds ALL resolved markets (`status IN ('resolved_yes', 'resolved_no')`) that have bets where `payout IS NULL`
- For each affected market, payouts are recalculated using the corrected formula:
  - If `winning_pool = 0`: all bets get `payout = 0`
  - If `losing_pool = 0` (one-sided winning): each winning bet gets `payout = amount` (their bet back)
  - Otherwise: `payout = floor(bet_amount::numeric / winning_pool * total_pool)` for winners, `payout = 0` for losers
- Winners' `group_members.token_balance` is credited by adding their calculated payout
- All remaining NULL-payout bets (losing side, or scenarios with `winning_pool = 0`) are set to `payout = 0`
- The migration is idempotent — it only processes bets where `payout IS NULL`, so running it again produces no changes
- The migration logs output via `RAISE NOTICE` showing how many markets, bets, and tokens were reconciled

### Verification Queries
- After the RPC fix is deployed and reconciliation migration is run, the following MUST hold:
  - `SELECT COUNT(*) FROM bets b JOIN markets m ON m.id = b.market_id WHERE m.status IN ('resolved_yes', 'resolved_no') AND b.payout IS NULL` returns `0`
  - For the specific affected market ("Blah blah blah" targeting Matt Goodman), Seth Behar's `group_members.token_balance` reflects the 1,750 token credit
  - No resolved market has any bet with `payout IS NULL`

## Detection Logic

### How to identify affected markets
- Query: `SELECT m.id, m.status, m.secret_word, COUNT(*) AS null_payout_bets FROM markets m JOIN bets b ON b.market_id = m.id WHERE m.status IN ('resolved_yes', 'resolved_no') AND b.payout IS NULL GROUP BY m.id, m.status, m.secret_word`
- Any rows returned indicate markets that were resolved but payouts were not fully processed

### How to identify affected users
- Users with winning bets where `payout IS NULL`: their bet is on the winning side but payout was never calculated
- Users where `payout` is set but `group_members.token_balance` was never incremented: requires comparing expected cumulative payouts against actual balance (harder to detect without an audit log)
- Query for NULL-payout winners: `SELECT b.user_id, b.amount, b.side, m.status, m.secret_word FROM bets b JOIN markets m ON m.id = b.market_id WHERE m.status IN ('resolved_yes', 'resolved_no') AND b.payout IS NULL AND ((m.status = 'resolved_yes' AND b.side = 'yes') OR (m.status = 'resolved_no' AND b.side = 'no'))`

## Correct Behavior

- Seth bets 1,750 on NO, sole bettor, market resolves NO → `payout = 1,750`, `group_members.token_balance += 1,750`
- 3 users bet YES (100, 200, 300), 1 user bets NO (400), market resolves YES → YES pool = 600, total pool = 1,000 → payouts: `floor(100/600*1000) = 166`, `floor(200/600*1000) = 333`, `floor(300/600*1000) = 500`. Each winner's balance credited accordingly.
- 2 users bet YES (500, 500), 0 users bet NO, market resolves YES → winning pool = total pool = 1,000, losing pool = 0 → each bettor gets exactly their bet back: `payout = 500`, `payout = 500`
- 2 users bet YES (500, 500), 0 users bet NO, market resolves NO → winning pool = 0 → all bets get `payout = 0`, no balance credits
- Market with 0 bets resolves → status updates, no payout operations, no errors

## Incorrect Behavior (Current)

- Seth bets 1,750 on NO, sole bettor, market resolves NO → market status changes to `resolved_no` with Pool: 1,750 visible in UI, but `bets.payout` is NULL or not set, and `group_members.token_balance` is never credited
- One-sided market resolves for the winning side → `winning_pool` equals `total_pool`, `losing_pool` = 0, and either:
  - Division by zero occurs silently and payout logic is skipped
  - Payout is calculated but balance credit UPDATE fails due to incorrect JOIN (missing `group_id` condition)
  - The NO outcome codepath has a bug that doesn't mirror the YES codepath correctly

## Edge Cases

- **One-sided market, winning side:** All bets on YES, resolves YES → every bettor gets exactly their bet back (no profit, no loss). Same for all-NO resolving NO.
- **One-sided market, losing side:** All bets on YES, resolves NO → all tokens lost, every bet gets `payout = 0`. Same for all-NO resolving YES.
- **Sole bettor wins:** Single bet on e.g. NO for 1,750, resolves NO → entire pool (1,750) returned. `payout = floor(1750 / 1750 * 1750) = 1750`.
- **Sole bettor loses:** Single bet on YES for 1,750, resolves NO → `payout = 0`, tokens lost.
- **Market with 0 bets resolves:** Status updates normally, no payout operations, no errors raised.
- **Already-correctly-resolved markets:** Reconciliation migration skips them entirely — all bets already have non-NULL `payout` values.
- **Partial prior reconciliation:** Some bets on a market were fixed by a previous run of `004_reconcile_payouts.sql` but others were not — the new migration only processes bets where `payout IS NULL`.
- **User in multiple groups:** Balance credit must use both `user_id` AND `group_id` to update the correct group's balance, not just `user_id`.
- **NO outcome symmetry:** The RPC must treat NO wins identically to YES wins — the only difference is which side is designated as winning.
