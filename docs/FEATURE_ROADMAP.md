# Feature Roadmap
## Project: Doable (TickTick Clone)

**Version:** 0.1
**Last updated:** 2026-08-06

---

## Roadmap Overview

| Phase | Theme | Target Outcome |
|---|---|---|
| Phase 0 | Foundation | Monorepo, CI/CD, Cloudflare deploy pipeline working end-to-end with a "hello world" |
| Phase 1 | MVP — Core Task Management | Usable daily for real task tracking |
| Phase 2 | Calendar, Focus Timer, PWA/Offline | Feature parity with TickTick's daily-driver features |
| Phase 3 | Habits, Stats, Polish | Habit tracking, insights, refined UX |
| Phase 4 | Stretch | NLP quick-add, calendar sync, multi-user/sharing |

---

## Phase 0 — Foundation (Infra & Scaffolding)

**Goal:** Empty-but-deployed app. No task features yet.

- [ ] Initialize monorepo (pnpm workspaces + Turborepo)
- [ ] Scaffold `apps/web` (Vite + React + TS + Tailwind)
- [ ] Scaffold `apps/api` (Cloudflare Worker + Hono + TS)
- [ ] Scaffold `packages/shared` (Zod schemas, shared types)
- [ ] Set up Drizzle ORM + D1 binding, write first migration (empty `users` table)
- [ ] `wrangler.toml` for both apps with `dev`/`preview`/`production` environments
- [ ] GitHub Actions: lint, typecheck, test, deploy-on-merge
- [ ] Deploy skeleton to Cloudflare Pages + Workers, confirm frontend can call API and read from D1
- [ ] Basic health-check route (`GET /api/health`)

**Exit criteria:** Visiting the deployed URL shows a page that fetches "OK" from the live API backed by D1.

---

## Phase 1 — MVP: Core Task Management

**Goal:** You can fully replace TickTick for daily task tracking.

### Auth
- [x] Sign up / login / logout (email + password)
- [x] Session cookie handling, protected API routes

### Lists & Folders
- [x] Create/rename/delete/reorder lists
- [x] Group lists into folders — implemented as nested sub-lists (create via list ⋯ menu, indented tree in sidebar, cycle-safe re-parenting on the API)

### Tasks — Core CRUD
- [x] Quick Add (title only, no NLP parsing yet — plain due-date picker)
- [x] Task detail: notes, due date/time, priority, list, tags
- [x] Subtasks/checklist items
- [x] Complete/uncomplete task
- [x] Edit/delete task
- [x] Reorder within a list (currently via up/down buttons, not drag-and-drop)

### Recurrence
- [x] Daily/weekly/monthly recurrence
- [x] Completing a recurring task generates the next instance

### Smart Views
- [x] Today
- [x] Next 7 Days
- [x] All Tasks
- [x] Completed
- [x] Filter by tag / by list

### Tags
- [x] Create/assign/remove tags
- [x] Tag color coding

### Search
- [x] Basic full-text search on task title/notes

### UI/UX baseline
- [x] Responsive layout (mobile + desktop)
- [x] Dark/light theme toggle
- [x] Empty states, loading states, error toasts

**Exit criteria:** You stop opening the real TickTick app for day-to-day capture and review.

---

## Phase 2 — Daily-Driver Parity

**Goal:** Match the TickTick features you'd actually miss.

- [ ] Calendar view (month + week), tasks plotted by due date
- [ ] Focus timer (Pomodoro) attachable to a task, session history
- [ ] PWA support: installable, offline read access, optimistic offline task creation with background sync
- [ ] Natural-language Quick Add ("submit report fri 5pm", "gym every mon/wed/fri")
- [ ] Reminders/notifications (browser push notifications via Cloudflare + Web Push)
- [ ] Keyboard shortcuts (quick add, navigate lists, mark complete)
- [ ] Data export (JSON/CSV backup)

**Exit criteria:** No feature gap left that interrupts your daily workflow compared to TickTick.

---

## Phase 3 — Habits, Stats & Polish

- [ ] Habit tracker: define recurring habits separate from tasks, streaks, check-in grid calendar
- [ ] Productivity stats: tasks completed per day/week, focus-time totals, streak visualizations
- [ ] Custom smart list builder (filter by arbitrary combination of tag/priority/list/date range)
- [ ] Bulk actions (multi-select complete/delete/move)
- [ ] Rich notes (basic markdown support in task notes)
- [ ] Attachments on tasks (Cloudflare R2-backed file upload)
- [ ] Command palette (Cmd+K style quick navigation/actions)
- [ ] Accessibility pass (keyboard nav audit, screen reader labels, contrast check)

---

## Phase 4 — Stretch Goals

- [ ] Two-way Google Calendar sync
- [ ] Multi-user support: shared lists, task assignment (turns this from personal tool into small-team tool)
- [ ] Native-feeling mobile wrapper (Capacitor) if browser PWA isn't enough
- [ ] Voice quick-add (Web Speech API)
- [ ] AI-assisted task breakdown (e.g., "plan my week" → suggested task list) — could use Claude API
- [ ] End-to-end encryption of task content at rest

---

## Feature Parity Checklist vs. TickTick (Reference)

Use this to sanity-check scope creep vs. what actually matters to you:

| TickTick Feature | In Doable Roadmap? | Phase |
|---|---|---|
| Quick add with NLP dates | Yes | 2 |
| Lists/folders | Yes | 1 |
| Tags | Yes | 1 |
| Priorities | Yes | 1 |
| Subtasks | Yes | 1 |
| Recurring tasks | Yes | 1 |
| Calendar view | Yes | 2 |
| Pomo/Focus timer | Yes | 2 |
| Habit tracker | Yes | 3 |
| Reminders/notifications | Yes | 2 |
| Cross-device sync | Yes (server-backed from MVP) | 1 |
| Collaboration/sharing | Yes | 4 (stretch) |
| Calendar app integration | Yes | 4 (stretch) |
| Widgets (OS-level) | No | Not planned (web-only) |
| Eisenhower matrix view | No (evaluate later) | Unscheduled |

---

## Notes on Sequencing

- Ship Phase 1 narrowly — resist adding Phase 2/3 features mid-phase. The value of this roadmap comes from *not* letting MVP scope creep toward full parity before it's proven useful daily.
- Re-evaluate the roadmap after 2 weeks of real MVP usage; reorder Phase 2/3 items based on what you actually miss, not what seems interesting to build.
