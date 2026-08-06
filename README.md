# Get It Done

A single-user, TickTick-style task manager. Capture tasks, organize them into nested lists and tags, set due dates and priority, break work into subtasks, and set up recurring tasks.

Live at **https://getitdone.arga-automation.xyz**

## Features

- Email + password auth with secure (PBKDF2) session cookies
- Inbox, Today, Next 7 Days, All Tasks, Completed smart views
- Nested lists (parent list → sub-lists), reorder within a group, cycle-safe re-parenting
- Tags with color coding, rename/delete
- Task detail: notes, due date/time, priority, list, tags, subtasks
- Recurring tasks (RRULE: daily / weekly / monthly) — completing one spawns the next instance
- Quick Add + full-text search
- Dark/light themes, responsive mobile layout, paper-notebook UI

## Tech Stack

- **Web** — Vite, React, TypeScript, Tailwind CSS v4, TanStack Query, React Router
- **API** — Cloudflare Worker, Hono, Drizzle ORM + D1, Zod
- **Shared** — Zod schemas, date helpers, RRULE recurrence (pnpm workspace)
- Tooling — Turborepo, Biome, Vitest

## Getting Started

```sh
pnpm install
pnpm dev
```

- Web: http://localhost:5173 (Vite proxies `/api` to the local Worker)
- API: `wrangler dev` on http://localhost:8787

Local D1 schema:

```sh
pnpm db:migrate:local
```

## Tests

```sh
pnpm test        # all workspaces
pnpm lint        # Biome
pnpm typecheck   # tsc --noEmit
```

## Repo Layout

```
apps/
  web/     # React frontend
  api/     # Cloudflare Worker (Hono + Drizzle + D1)
packages/
  shared/  # Zod schemas, dates, recurrence
docs/      # PRD, feature roadmap, sprint todo
```

## Deployment

- **API**: `pnpm --filter @getitdone/api deploy:production` (worker `getitdone-api-production`, D1 `getitdone-db`)
- **Web**: build with `VITE_API_URL` set to the API worker, then deploy `dist/` to Cloudflare Pages project `getitdone`
- Production vars (`APP_ENV`, `CORS_ORIGIN`, D1 ids) live in `apps/api/wrangler.toml` under `[env.production]`

## Docs

- `docs/PRD.md` — product requirements
- `docs/FEATURE_ROADMAP.md` — feature roadmap with progress
- `docs/SPRINT_TODO.md` — sprint planning
