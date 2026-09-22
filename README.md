# Pilot Control Console

An admin console for running an internal AI pilot: track who's using it, what
they're using it for, and stop budget overruns before they happen.

## What it does

- **Single admin login** — one password gates the whole app.
- **Users** — add pilot participants, give each one a monthly budget, block
  anyone who needs to pause, and log usage against them.
- **Use cases** — track what the pilot is being used for, who owns each one,
  and give each a budget cap independent of the owner's overall budget.
- **Dashboard** — total budget vs. spend across the pilot, and a "needs
  attention" list of anyone over budget or blocked.
- **Budget alerts** — every budget bar turns amber at 80% of cap and red at
  100%+, on the dashboard, the users page, and the use cases page.

Usage/cost entries are logged manually (via the "+ Log usage" action on a
user or use case). This is intentionally a lightweight tracking tool, not an
API usage integration — see "Next steps" below if you want it to pull real
numbers automatically.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, with Prisma + SQLite for
storage. No external services required to run it.

## Getting started

```bash
npm install
cp .env.example .env   # then edit ADMIN_PASSWORD and SESSION_SECRET
npm run db:push        # creates dev.db from the Prisma schema
npm run dev            # http://localhost:3000
```

Sign in with the password you set as `ADMIN_PASSWORD`.

Optional: `npm run db:seed` adds two example users and use cases so the
dashboard isn't empty on first run (it no-ops if you already have data).

## Environment variables

| Variable         | Purpose                                              |
| ---------------- | ----------------------------------------------------- |
| `DATABASE_URL`   | SQLite file path, e.g. `file:./dev.db`                |
| `ADMIN_PASSWORD` | The password for the single admin login               |
| `SESSION_SECRET` | Random string used to sign the login session cookie    |

Set real, unique values for `ADMIN_PASSWORD` and `SESSION_SECRET` before
using this anywhere but your own machine — the `.env.example` defaults are
placeholders only.

## Data model

- `User` — name, email, team, monthly budget, status (`active`/`blocked`).
- `UseCase` — name, description, owner (a `User`), budget cap, status
  (`active`/`paused`).
- `UsageEntry` — an amount logged against a user and, optionally, a use case.
  A user's "spent" total is the sum of their usage entries; same for a use
  case.

## Known limitations / next steps

- Usage is entered manually — there's no live integration with the
  Anthropic Console or API for automatic cost data yet. If you want that,
  the next step is a scheduled job that pulls usage from the Anthropic API
  and calls the same `POST /api/usage` endpoint this UI uses.
- Single shared admin password, no per-admin accounts or audit log of who
  changed what.
- No email/Slack alerting yet — over-budget and blocked users only show up
  when someone opens the dashboard.
