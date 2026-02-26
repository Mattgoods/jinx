# 03 — Markets

## Topic
Market creation, lifecycle state management, time windows, and secret word redaction for the target user.

## Acceptance Criteria

- Any group member can create a market by selecting a target person from the group roster, entering a secret word, and defining a start/end time window
- The market creator cannot target themselves
- The secret word is stored in the database and visible to all group members except the target user
- The target user sees a redacted version of the market: they know a market exists about them, the time window, the bet count, and the pool size — but never the secret word
- Markets follow a strict lifecycle: `active` → `pending_resolution` → `resolved_yes` | `resolved_no`, with `cancelled` possible from any pre-resolution state
- A market transitions to `pending_resolution` when the time window closes
- Only the market creator can resolve a market, and only after the time window has closed
- The creator resolves by selecting YES (the word was said) or NO (it was not)
- Resolved markets reveal the secret word to everyone, including the target
- Cancelled markets refund all bets to the original bettors
- Past resolved markets are browsable with full details including the secret word, final odds, resolution, and payouts
- The time window start must be in the future at creation time
- The time window end must be after the time window start

## User Flows

- **Create market:** Member navigates to `/markets/new` → selects target → enters secret word → sets time window → submits → market appears in group feed
- **View as non-target:** User sees market card with target name, secret word, time window, probability bar, pool size, and bet options
- **View as target:** User sees market card with their name, "REDACTED" for the word, time window, bet count, and pool size — no ability to bet
- **Resolve:** After time window closes, creator goes to `/markets/:id/resolve` → selects YES or NO → payouts distributed
