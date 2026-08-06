# Sprint To-Do List
## Sprint 1 — Foundation & Monorepo Setup

**Sprint goal:** Get a deployed, empty "hello world" app running end-to-end on Cloudflare (Pages + Workers + D1), with CI/CD and testing scaffolding in place. Corresponds to **Phase 0** of `FEATURE_ROADMAP.md`.

**Duration suggestion:** 1 week (solo dev, part-time pace)

---

## Day 1 — Monorepo Scaffolding

- [ ] `mkdir doable && cd doable && git init`
- [ ] Set up pnpm workspaces (`pnpm-workspace.yaml` with `apps/*` and `packages/*`)
- [ ] Install & configure Turborepo (`turbo.json` with `build`, `dev`, `lint`, `test`, `typecheck` pipelines)
- [ ] Root `tsconfig.base.json` shared across workspaces
- [ ] Root `.eslintrc` / Biome config (pick one linter/formatter, keep consistent)
- [ ] `.gitignore` (node_modules, .wrangler, dist, .env)
- [ ] Push initial commit to GitHub repo

**Suggested folder structure:**
```
doable/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/           # Cloudflare Worker (Hono)
├── packages/
│   └── shared/         # Zod schemas, shared TS types
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## Day 2 — Frontend Skeleton (`apps/web`)

- [ ] `pnpm create vite apps/web -- --template react-ts`
- [ ] Install Tailwind CSS, configure `tailwind.config.ts`
- [ ] Install TanStack Query, set up `QueryClientProvider`
- [ ] Basic routing (React Router or TanStack Router)
- [ ] Placeholder pages: `/login`, `/app` (empty shell)
- [ ] Confirm `pnpm --filter web dev` runs locally

---

## Day 3 — Backend Skeleton (`apps/api`)

- [ ] `pnpm create hono apps/api` (or manual Worker scaffold via `wrangler init`)
- [ ] Install Hono, set up basic router
- [ ] `GET /api/health` route returning `{ status: "ok" }`
- [ ] Set up `wrangler.toml` with `[env.dev]`, `[env.preview]`, `[env.production]`
- [ ] Confirm `wrangler dev` runs API locally and `/api/health` responds

---

## Day 4 — Database (D1) + Shared Package

- [ ] Create D1 database: `wrangler d1 create doable-db`
- [ ] Add D1 binding to `wrangler.toml`
- [ ] Install Drizzle ORM + `drizzle-kit`
- [ ] Define first schema: `users` table (id, email, password_hash, created_at)
- [ ] Generate & run first migration locally (`wrangler d1 migrations apply --local`)
- [ ] Scaffold `packages/shared`: export a Zod schema for `User`, wire into both `apps/web` and `apps/api` via workspace `tsconfig` paths
- [ ] Verify API can read/write to local D1 (simple test insert + query route)

---

## Day 5 — CI/CD Pipeline

- [ ] GitHub Actions workflow: `lint-and-typecheck` job on PR
- [ ] GitHub Actions workflow: `test` job (Vitest, even with placeholder tests) on PR
- [ ] GitHub Actions workflow: `deploy` job on merge to `main`:
  - [ ] `wrangler deploy` for `apps/api`
  - [ ] `wrangler pages deploy` for `apps/web` build output
- [ ] Add Cloudflare API token + account ID as GitHub Secrets
- [ ] Confirm production D1 database created and bound (separate from dev/preview)
- [ ] Trigger a real deploy, verify live URL serves the frontend and hits the deployed Worker

---

## Day 6 — Testing Scaffolding

- [ ] Install Vitest across workspaces
- [ ] Install `@cloudflare/vitest-pool-workers` (or Miniflare test setup) for `apps/api`
- [ ] Write first passing unit test (e.g., a Zod schema validation test in `packages/shared`)
- [ ] Write first integration test (e.g., `GET /api/health` returns 200 via test Worker instance)
- [ ] Install Playwright in `apps/web`, write one smoke E2E test (page loads, shows expected title)
- [ ] Confirm all test types run via `pnpm turbo test`

---

## Day 7 — Buffer / Cleanup / Documentation

- [ ] Fix anything broken from the week
- [ ] Write root `README.md`: how to run dev, how to deploy, folder structure overview
- [ ] Confirm `.env.example` documents required secrets/vars
- [ ] Tag `v0.0.1-foundation` in git
- [ ] Review `FEATURE_ROADMAP.md` Phase 1 and break it into Sprint 2's to-do list

---

## Definition of Done for This Sprint

- [ ] Visiting the production URL loads the frontend shell
- [ ] Frontend successfully calls `/api/health` on the deployed Worker and displays the result
- [ ] D1 database is provisioned in production and a test write/read succeeds
- [ ] CI blocks merge on lint/typecheck/test failure
- [ ] Merging to `main` auto-deploys both frontend and API
- [ ] At least one test exists at each level (unit, integration, E2E) and passes in CI

---

## Carry-Over / Notes
*(Use this section during the sprint to jot anything that comes up but shouldn't derail Phase 0 scope — pull into Sprint 2 planning.)*

-
-
-
