# AGENTS.md — Jinx Operational Guide

## Build & Run

- **Frontend dev:** `npm run dev` (Vite, runs on http://localhost:5173)
- **Type check:** `npx tsc --noEmit`
- **Lint:** `npx eslint src/ api/`
- **Build:** `npm run build`

## Validation

Run these after implementing to get immediate feedback:

- Tests: `npx vitest run`
- Typecheck: `npx tsc --noEmit`
- Lint: `npx eslint src/ api/ --max-warnings=0`
- Build: `npm run build`

## Project Structure

- `src/` — React frontend (pages, components, hooks, lib)
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

(Ralph will add learnings here as the project develops)
