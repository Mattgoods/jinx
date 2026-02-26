# 04 — Betting

## Topic
Parimutuel bet placement, real-time probability calculation, and proportional payout distribution on market resolution.

## Acceptance Criteria

- Any group member except the target can place bets on an active market
- Bets are placed as YES (the target will say the word) or NO (they won't)
- The minimum bet is 1 token; there is no maximum beyond the user's available balance
- A user can place multiple bets on the same market, including on different sides
- Placing a bet immediately deducts the amount from the user's token balance
- The displayed probability updates immediately when a bet is placed: P(YES) = yes_pool / total_pool
- If no bets have been placed, probability displays as 50/50
- When a market is resolved, the entire pool is distributed to the winning side proportionally to each winner's contribution
- Payout formula per winner: floor(bet_amount / winning_side_pool × total_pool)
- Losers receive a payout of 0
- If all bets are on the winning side, each bettor receives exactly their bet back (no profit)
- If all bets are on the losing side, all tokens are lost (no winners)
- Rounding losses (at most a few tokens) are acceptable and discarded
- Before placing a bet, the UI shows a preview of the potential payout based on current pool state
- Bet placement and token deduction happen atomically (in a single database transaction)
- A user cannot bet on a market where they are the target (returns a clear error)
- A user cannot bet more tokens than their current balance (returns a clear error)
- Bets are only accepted while the market status is `active` and the current time is before `window_end`

## Edge Cases

- Empty market (0 bets) resolved → no payouts, status updates normally
- One-sided market where everyone bet YES and it resolves YES → everyone gets their bet back
- One-sided market where everyone bet YES and it resolves NO → all tokens lost, no winners
