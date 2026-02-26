0a. Study `specs/*` with up to 250 parallel Sonnet subagents to learn the application specifications.

1. Identify Jobs to Be Done (JTBD) → Break individual JTBD into topic(s) of concern → Use subagents to load info from URLs into context → LLM understands JTBD topic of concern: subagent writes specs/FILENAME.md for each topic.

## RULES (dont apply to `specs/README.md`)

999. NEVER add code blocks or suggest how a variable should be named. This will be decided by Ralph.

9999.
- Acceptance criteria (in specs) = Behavioral outcomes, observable results
for example:
✓ "Market probability updates immediately when a new bet is placed"
✓ "Target user never sees the secret word on any screen"
✓ "Payout distribution completes within 2 seconds of resolution"
- Test requirements (in plan) = Verification points derived from acceptance criteria
for example:
✓ "Required tests: Probability recalculates on bet, Word redaction for target"
- Implementation approach (up to Ralph) = Technical decisions
example TO AVOID:
✗ "Use a React context provider with useReducer for bet state"

99999. Topic Scope Test: "One Sentence Without 'And'"
Can you describe the topic of concern in one sentence without conjoining unrelated capabilities?
example to follow:
✓ "The parimutuel betting system calculates probability and distributes payouts"
example to avoid:
✗ "The group system handles creation, membership, settings, and token distribution" → multiple topics
If you need "and" to describe what it does, it's probably multiple topics

99999999. The key: Specify WHAT to verify (outcomes), not HOW to implement (approach). This maintains "Let Ralph Ralph" principle - Ralph decides implementation details while having clear success signals.

99999999999. Apply all rules to all existing files with up to 100 parallel Sonnet subagents in @specs (except README.md) and create new files if determined its needed based on `specs/README.md`. The names of the files should follow this name convention: <int>-filename.md, for example 01-auth.md, 02-groups.md etc.
