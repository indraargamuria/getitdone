# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

- pnpm monorepo (Turborepo): `apps/web` (Vite + React + TS + Tailwind v4, TanStack Query, React Router), `apps/api` (Cloudflare Worker, Hono, Drizzle + D1), `packages/shared` (Zod schemas, dates, RRULE recurrence).
- Docs: `docs/PRD.md`, `docs/FEATURE_ROADMAP.md`, `docs/SPRINT_TODO.md`.

## Commands

- `pnpm dev` — run all apps (web on `localhost:5173`, API via `wrangler dev`).
- `pnpm test` — run all tests (shared / web / api).
- `pnpm lint` — Biome across workspaces.
- `pnpm typecheck` — `tsc --noEmit` across workspaces.
- `pnpm --filter @getitdone/web build` — typecheck + Vite build.
- API tests: `pnpm --filter @getitdone/api test`. Add `-- --env production` / `--env preview` to the `db:migrate:*` scripts already handled in `apps/api/package.json`.

## Git workflow (IMPORTANT)

- Repo: `https://github.com/indraargamuria/getitdone.git`, default branch `main`.
- **Every time a coding task/feature/fix is completed, commit and push to `main`.**
- Write a concise, repo-style commit message: `feat: ...`, `fix: ...`, `chore: ...`, `deploy: ...`, `refactor: ...`.
- Stage deliberately; never commit secrets (`.env*` is gitignored — only `.env.example` is tracked). Keep the working tree clean after each completed task.
- Use `git status` + `git diff` before committing; only commit when the user explicitly asks or per the convention above (a completed task implies a commit).

## Deployment

- API: `pnpm --filter @getitdone/api deploy:production` (worker `getitdone-api-production`, prod D1 `getitdone-db`).
- Web: build with `VITE_API_URL` pointing at the API worker, then `wrangler pages deploy` the `dist/` to Pages project `getitdone` (custom domain `getitdone.arga-automation.xyz`).
- Production vars live in `apps/api/wrangler.toml` under `[env.production]` (`APP_ENV`, `CORS_ORIGIN`; D1 ids). Redeploy the API after changing them.
