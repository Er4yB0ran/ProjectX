# ProjectX

AI-powered weekly planner that builds your week around your energy cycle, turns it into daily tasks and adapts when plans slip.

**Live demo:** [project-x-pi-five.vercel.app](https://project-x-pi-five.vercel.app) · UI language: Turkish

## How it works

1. **Onboarding** — a 5-step form collects your sleep schedule, fixed commitments, energy peaks, free days and routines.
2. **Weekly skeleton** — Claude generates a weekly template of time blocks, each scored for energy cost and flexibility. An optional chat editor lets you refine the draft in plain language before saving.
3. **Daily tasks** — each day's tasks are materialized from the template; you can add, complete or cancel tasks manually.
4. **Smart rescheduling** — a missed task is moved to a free slot later the same day, the next day, or the nearest day it fits. Flexible tasks can be split in two.
5. **Close Day** — a short AI-written reflection summarizes what got done and what didn't.
6. **Analytics** — completion rates by time of day, a day × time productivity heatmap and AI suggestions for improving your template. Suggestions are never applied without your approval.

An admin panel shows user reports, AI chat token usage and a feature flag for the chat editor.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Supabase — Postgres, Auth, Row Level Security, RPC functions |
| AI | Claude Haiku 4.5 via the Vercel AI SDK (`generateObject`, Zod schemas) |
| Hosting | Vercel |

## Getting started

```bash
npm install
npm run dev
```

Create `.env.local` with:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features |
| `NEXT_PUBLIC_DEV_BYPASS` | Optional. `true` enables the development login shortcut |

Database migrations live in `supabase/migrations/`. After a schema change, regenerate types with `npm run db:types`.

## Project structure

```
src/app/(auth)        login and signup
src/app/onboarding    5-step onboarding and skeleton chat editor
src/app/(dashboard)   today, weekly template, tasks archive, analytics
src/app/admin         admin panel
src/app/api           onboarding endpoints (generate, edit, commit)
src/lib               shared logic: analytics, skeleton blocks, Supabase clients
supabase/migrations   database schema and RPC functions
```

## Documentation

- [`docs/`](docs) — core logic, database schema and tech stack
- [`ai-context/`](ai-context) — current state, vision, roadmap and deferred decisions
