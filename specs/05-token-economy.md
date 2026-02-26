# 05 — Token Economy

## Topic
Weekly token distribution to group members, balance management, and transactional integrity of token operations.

## Acceptance Criteria

- Every group has a configurable weekly token amount (default: 1000) and distribution day (default: Monday)
- On the configured day, each group member receives the weekly token allocation added to their balance
- Token distribution is idempotent — running the distribution job multiple times in the same week does not double-distribute
- A distribution audit log records every token grant (group, user, amount, timestamp)
- A user who joins a group mid-week receives their first tokens on the next distribution day
- Token balances are per-group — a user in multiple groups has independent balances
- Token balances can never go negative (enforced at the application layer before write)
- All token movements (bet placement, payout, refund, distribution) are recorded and traceable
- The admin can change the weekly token amount at any time; the new amount takes effect on the next distribution
- The admin can change the distribution day; the new day takes effect on the next occurrence

## Distribution Mechanism

- A Vercel Cron job runs daily and checks if today matches any group's `token_distribution_day`
- For matching groups, it distributes tokens to all members who haven't already received tokens this week
- "This week" is defined by the current ISO calendar week (Monday–Sunday)
