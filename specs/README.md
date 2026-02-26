# Jinx — Specification Index

A social prediction market where friends bet fake currency on whether someone will say a specific word during a given time window.

## Specs

| File | Topic of Concern |
|---|---|
| `01-auth.md` | Authentication via Clerk with Google OAuth and user syncing to Supabase |
| `02-groups.md` | Group creation, joining via invite code, and membership management |
| `03-markets.md` | Market creation, lifecycle, time windows, and secret word redaction |
| `04-betting.md` | Parimutuel bet placement, probability calculation, and payout distribution |
| `05-token-economy.md` | Weekly token distribution, balance management, and transaction integrity |
| `06-leaderboard-stats.md` | Group leaderboard ranking and personal statistics |
| `07-frontend-design.md` | Design system, component patterns, animations, and responsive layout |
| `08-api-serverless.md` | Serverless function patterns, error handling, and endpoint contracts |

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4, React Router v7
- Backend: Vercel Serverless Functions (Node.js, TypeScript)
- Database: Supabase (PostgreSQL) with Row Level Security
- Auth: Clerk (Google OAuth only)
- Hosting: Vercel
