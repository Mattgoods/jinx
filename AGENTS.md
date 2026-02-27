# AGENTS.md — Jinx Operational Guide

## Build & Run

- **Frontend dev:** `npm run dev` (Vite, runs on http://localhost:5173)
- **Type check:** `npx tsc --noEmit`
- **Lint:** `npx eslint src/ api/`
- **Build:** `npm run build`

## Validation

Run these after implementing to get immediate feedback:

- Typecheck: `npx tsc -b` (uses project references, builds all tsconfigs)
- Typecheck (no emit): `npx tsc --noEmit` only checks `src/`, use `tsc -b` for full check including `api/`
- Lint: `npx eslint .` (config in `eslint.config.js`, covers `**/*.{ts,tsx}`)
- Build: `npm run build` (runs `tsc -b && vite build`)
- Tests: `npx vitest run` (45 tests for UI components)

## Project Structure

- `src/` — React frontend (pages, components, hooks, lib)
- `src/components/ui/` — Shared UI component library (Button, Card, FormField, StatusBadge, Avatar, etc.)
- `api/` — Vercel serverless functions (each file = endpoint)
- `api/_lib/` — Shared server utilities (auth, supabase client)
- `src/lib/` — Shared frontend utilities and helpers
- `specs/` — Requirement specifications (source of truth)
- `docs/` — Architecture and reference documentation

## Codebase Patterns

- Serverless functions verify Clerk session token via `api/_lib/auth.ts`
- Supabase accessed with service role key server-side only
- Frontend uses `useApiClient()` hook for authenticated fetch calls
- All token operations happen in DB transactions (deduct + insert bet + update pool)
- Secret word redaction happens at the API layer, not the DB layer

## Operational Notes

- Tailwind v4 uses `@theme` in CSS instead of `tailwind.config.ts` — design tokens are in `src/index.css`
- API functions use `@vercel/node` types (`VercelRequest`, `VercelResponse`)
- Three tsconfig files: `tsconfig.app.json` (src/), `tsconfig.node.json` (vite.config), `tsconfig.api.json` (api/)
- `tsc -b` builds all three; `tsc --noEmit` alone only checks the files in `tsconfig.app.json` include
- Supabase RPC functions (`place_bet`, `increment_balance`) are defined in the migration SQL and called via `supabase.rpc()`
- ESLint strict no-unused-vars: cannot use `_` prefix for destructured-away props; use object key filtering instead
- Vitest configured in `vite.config.ts` with `jsdom` environment, setup file at `src/test/setup.ts`
- `react-hooks/set-state-in-effect` lint rule: avoid calling setState synchronously in useEffect; use event handlers or `.then()` callbacks
