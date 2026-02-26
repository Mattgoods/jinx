# 06 — Leaderboard & Stats

## Topic
Group leaderboard ranking members by profit/loss, and personal statistics tracking for each user.

## Acceptance Criteria

- The group leaderboard ranks all members by lifetime profit/loss (descending)
- Profit/loss is calculated as: SUM(payout - bet_amount) across all resolved bets in the group
- Only resolved bets count (where payout is not null)
- Cancelled market bets contribute 0 to profit/loss (payout equals bet amount)
- The leaderboard displays each member's rank, display name, avatar, profit/loss, total bets, and win rate
- Win rate = total winning bets / total resolved bets
- The user's personal profile shows: current token balance per group, bet history with outcomes and per-market profit/loss, and a lifetime aggregate profit/loss
- Bet history shows the market details (target, word — revealed only for resolved markets), the user's bet side and amount, and the payout received
- Stats update immediately after a market is resolved

## User Flows

- **Leaderboard:** User navigates to `/leaderboard` → sees all group members ranked by P/L → can see their own rank highlighted
- **Profile:** User navigates to `/profile` → sees balances across groups, bet history, and aggregate stats
