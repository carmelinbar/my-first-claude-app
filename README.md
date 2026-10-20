# Pilot Control Console

An admin console for running an internal AI pilot: track who's using it, what
they're using it for, and stop budget overruns before they happen.

## What it does

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

Next.js (App Router) + TypeScript + Tailwind CSS, with Prisma + Postgres for
storage.

## Deploying on Vercel (recommended — no terminal needed)

1. Go to [vercel.com](https://vercel.com) and sign up / log in (you can use
   your GitHub account).
2. **Add New → Project**, import the `carmelinbar/my-first-claude-app`
   repository.
3. In the import screen, open **Git Branch** and pick
   `claude/pensive-archimedes-lysyb2` (or set it later in
   **Settings → Git → Production Branch**). Click **Deploy** — it will fail
   the first time because there's no database yet, that's expected.
4. Open the project, go to the **Storage** tab, **Create Database → Postgres**,
   and connect it to this project. Vercel wires up the `POSTGRES_PRISMA_URL`
   and `POSTGRES_URL_NON_POOLING` environment variables automatically — you
   don't need to type any connection string yourself.
5. Go to **Deployments** and **Redeploy** the latest deployment. This build
   creates the database tables automatically (see `package.json`'s `build`
   script) and should succeed.
6. Open the URL Vercel gives you (something like
   `my-first-claude-app.vercel.app`) — that's the live app.

There is no login — anyone with that URL has full admin access. Don't share
the link beyond the people who should have that access; Vercel's paid plans
offer a password-protection option for the whole site if you need one.

## Running locally instead

Requires your own Postgres database (e.g. a free one from
[neon.com](https://neon.com) or Vercel's Storage tab).

```bash
npm install
cp .env.example .env   # fill in your Postgres connection strings
npm run db:push        # creates the tables from the Prisma schema
npm run dev            # http://localhost:3000
```

Optional: `npm run db:seed` adds two example users and use cases so the
dashboard isn't empty on first run (it no-ops if you already have data).

## Environment variables

| Variable                   | Purpose                                              |
| --------------------------- | ----------------------------------------------------- |
| `POSTGRES_PRISMA_URL`       | Pooled Postgres connection string, used by the app     |
| `POSTGRES_URL_NON_POOLING`  | Direct Postgres connection string, used for schema changes |

On Vercel, both are set automatically once you connect a Postgres database
in the Storage tab (step 4 above).

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
- No authentication at all — the app trusts whoever can reach it. Only run
  this somewhere private (your own machine, or a deployment locked down by
  network access / a reverse-proxy login) until real auth is added back.
- No audit log of who changed what.
- No email/Slack alerting yet — over-budget and blocked users only show up
  when someone opens the dashboard.
