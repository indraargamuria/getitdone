# Product Requirements Document (PRD)
## Project: "Tasker" — A Personal To-Do App (TickTick-inspired)

**Version:** 0.1
**Owner:** You (solo builder)
**Status:** Draft

---

## 1. Overview

Tasker is a personal task-management web app inspired by TickTick, built for a single user (you) to manage tasks, lists, and simple habits. It is mobile-responsive, deployable entirely on Cloudflare's edge platform, and organized as a monorepo containing the frontend, backend/API, and shared packages.

This is a **personal-use** product first — no multi-tenant billing, no team collaboration in v1. The priority is a fast, reliable, good-looking task manager that works great on phone and desktop.

## 2. Goals & Non-Goals

### Goals
- Capture tasks quickly (low friction, keyboard-first on desktop, thumb-friendly on mobile)
- Organize tasks into Lists (aka Projects) and Smart Lists (Today, Next 7 Days, Inbox, etc.)
- Support due dates, reminders, priority, tags, subtasks, and notes
- Support recurring tasks (daily/weekly/monthly/custom RRULE)
- Basic habit tracking (stretch goal, v2)
- Offline-friendly, installable as a PWA
- Fast: sub-200ms interactions, edge-deployed
- Mobile responsive: works well from 320px to widescreen

### Non-Goals (v1)
- Multi-user collaboration / shared lists
- Team/enterprise features
- Native iOS/Android apps (PWA only for now)
- Calendar 2-way sync (Google/Outlook) — stretch/v2
- Pomodoro timer — stretch/v2
- Payment/subscription system

## 3. Target User

Just you — a single personal user who wants:
- A clean inbox to dump tasks fast
- Daily planning via "Today" and "Next 7 Days" views
- Lists for different life areas (Work, Personal, Errands, etc.)
- Reliable reminders/notifications
- A UI that doesn't get in the way

## 4. User Stories

| ID | As a user, I want to... | So that... |
|----|---------------------------|------------|
| US-01 | Quickly add a task from anywhere in the app | I don't lose a thought |
| US-02 | Parse natural language when typing a task ("Buy milk tomorrow 5pm #errands") | I can add tasks fast without clicking menus |
| US-03 | See all tasks due today in one view | I know what to focus on |
| US-04 | Organize tasks into lists/folders | I can separate work vs personal |
| US-05 | Set a task to repeat | I don't have to recreate recurring chores |
| US-06 | Break a task into subtasks | I can track multi-step work |
| US-07 | Set priority (P1–P4) | I know what matters most |
| US-08 | Get a reminder/notification before due time | I don't miss deadlines |
| US-09 | Mark tasks complete and see them in a completed log | I feel a sense of progress |
| US-10 | Use the app comfortably on my phone | I can manage tasks on the go |
| US-11 | Use the app offline and have it sync later | Connectivity issues don't block me |
| US-12 | Search/filter tasks by tag, list, or keyword | I can find things fast |
| US-13 | Drag and drop to reorder tasks and reschedule via drag onto a date | Planning feels tactile |
| US-14 | Have a dark mode | It's easier on the eyes at night |

## 5. Core Features (v1 Scope)

1. **Quick Add** — global add button + input, natural-language date/tag parsing
2. **Smart Lists** — Inbox, Today, Next 7 Days, All, Completed
3. **Custom Lists** — user-created lists with color/icon
4. **Task detail** — title, notes, due date/time, priority, tags, subtasks, list, recurrence
5. **Recurrence** — daily/weekly/monthly/custom (RRULE subset)
6. **Notifications** — browser push (Web Push API) for due/reminder times
7. **Drag & drop** — reorder within list, drag task to calendar/date
8. **Search & filter** — by keyword, tag, list, priority, date range
9. **Dark/light theme** — system-aware + manual toggle
10. **PWA** — installable, offline cache of shell + last-synced data
11. **Auth** — simple single-user auth (passkey or email+password), since it's personal use

## 6. Out of Scope Details (v1)
- Collaboration/sharing
- Calendar sync
- Pomodoro/focus timer
- Habit tracker (defer to v2, tracked in roadmap)

## 7. Technical Constraints
- Must deploy on **Cloudflare** (Pages/Workers, D1 or KV/Durable Objects for storage)
- Must be a **monorepo** (frontend + API + shared types/config in one repo)
- Must be **mobile responsive** (breakpoints: 360px, 768px, 1024px, 1440px)
- Should work as an installable **PWA**

## 8. Success Metrics (personal-use framing)
- You actually use it daily instead of falling back to Apple Notes/TickTick
- Task capture takes < 5 seconds from thought to saved task
- Zero data loss (sync reliability)
- App loads in < 1s on repeat visits (cached shell)

## 9. Assumptions
- Single user, single tenant, but auth is still implemented for security (public URL)
- No native push needed beyond Web Push (browser-based)
- Data volume is small (hundreds to low thousands of tasks) — no need for heavy scaling

## 10. Open Questions
- Do you want iCal export for read-only calendar viewing? (nice-to-have)
- Do you want a browser extension for quick capture? (defer to backlog)
- Passkey auth vs simple password + Cloudflare Access? (see Design doc, Section on Auth)

---
*See also: `FEATURE_ROADMAP.md`, `DESIGN.md`, `TESTING_STRATEGY.md`, `SPRINT_BACKLOG.md`*
