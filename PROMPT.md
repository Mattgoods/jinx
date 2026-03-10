# Jinx — Ralph Loop Prompt

**Copy-paste this prompt into a NEW GitHub Copilot conversation each iteration.**

---

## Phase 0: Orient

0a. Study the requirement specs in `specs/*` using subagents. These are the source of truth for what should be built.

0b. Study the project structure. Frontend is in `src/`, serverless functions are in `api/`, shared server utilities in `api/_lib/`. Read `AGENTS.md` for build commands, patterns, and operational learnings.

0c. Study `IMPLEMENTATION_PLAN.md` — the prioritized task list. Understand what has been done and what remains.

## Phase 1: Select & Implement

1. From `IMPLEMENTATION_PLAN.md`, choose the **most important uncompleted task** — give priority to backend tasks that unblock frontend tasks, and to foundational work over polish.

2. **Don't assume it's not implemented.** Before writing code, search the codebase to verify the task isn't already done. If it is, mark it complete in the plan and pick the next task.

3. Implement the task. Follow existing patterns:
   - Backend: Vercel serverless functions in `api/`, shared validators/auth/supabase in `api/_lib/`, ESM `.js` extensions on all relative imports
   - Frontend: Tailwind v4 utility classes, design tokens in `src/index.css`, `useApiClient()` hook for authenticated fetch, shared UI components from `src/components/ui/`
   - Study neighboring code for conventions before writing

4. If functionality is missing (a utility, a type, a helper), add it. Don't leave stubs or TODOs — complete the work.

## Phase 2: Test & Validate

5. If the task involves new or changed logic, write tests:
   - Frontend: add Vitest tests alongside components/hooks (`*.test.ts` / `*.test.tsx`)
   - Follow existing test patterns in `src/components/ui/*.test.tsx` and `src/pages/*.test.tsx`

6. Run backpressure checks:
   - Typecheck: `npx tsc -b` (builds all three tsconfigs — src, api, vite)
   - Lint: `npx eslint .`
   - Build: `npm run build` (runs `tsc -b && vite build`)
   - Tests: `npx vitest run`

7. If there are errors or test failures, fix them. Don't move on until the build is clean and tests pass.

## Phase 3: Update & Commit

8. Update `IMPLEMENTATION_PLAN.md`:
   - Mark the completed task with appropriate completion notation
   - If you discovered new tasks or bugs, add them under the appropriate section
   - If a task turned out to be unnecessary, note why and remove it

9. Update `AGENTS.md` **only if** you learned something operational that would help future iterations (e.g., a new pattern, a gotcha, a build quirk). Keep it brief — status updates belong in `IMPLEMENTATION_PLAN.md`.

10. Commit and push all changes to a **new feature branch**, then merge into `dev`:
    - Create branch from `dev`: `feature/<short-task-description>` (e.g., `feature/market-filters`)
    - Write a clear commit message summarizing what was implemented
    - Include all relevant code, test, and documentation changes
    - Push the branch to `origin`
    - Merge the feature branch into `dev` and push `dev`

## Guardrails

999. **One task per conversation.** Complete one task fully, validate it, update the plan, then stop. The next conversation picks up from the updated plan.

9999. **Don't break existing functionality.** If you're unsure whether a change is safe, read the code that depends on it first.

99999. **Capture the why.** When writing code, add comments for non-obvious decisions. When updating the plan, note discoveries.

999999. **Respect the 12-function Vercel limit.** Do not add new `.ts` files in `api/` subfolders without consolidating or removing another. Use `?action=` dispatch pattern (see `api/groups/manage.ts`, `api/users/index.ts`) and add Vercel rewrites.

9999999. **Implement completely.** No placeholders, stubs, or TODOs. Incomplete work wastes future iterations.
