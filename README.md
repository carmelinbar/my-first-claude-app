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
- **Real Anthropic usage (optional)** — link a user to an Anthropic Console
  workspace and click "Sync real usage" to pull their actual month-to-date
  spend straight from the Anthropic Cost API, instead of logging it by hand.

Usage/cost can be entered manually (via "+ Log usage") or pulled from the
real Anthropic Cost API per user (see "Syncing real Anthropic usage"
below) — the two add together into each user's total spend.

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
4. You need one Postgres database connected to this project, with its
   connection string saved as an environment variable named exactly
   `DATABASE_URL`:
   - Go to the project's **Storage** tab. If a database is already listed
     there, click it and look for a **"Connect"** or **".env.local"**
     section showing its connection string (starts with `postgresql://`).
     If nothing is listed, click **Create Database → Postgres** and create
     one.
   - Copy that connection string.
   - Go to **Settings → Environment Variables → Add New**. Set the key to
     `DATABASE_URL`, paste the connection string as the value, check all
     three environment boxes (Production, Preview, Development), and save.
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
cp .env.example .env   # fill in your Postgres connection string
npm run db:push        # creates the tables from the Prisma schema
npm run dev            # http://localhost:3000
```

Optional: `npm run db:seed` adds two example users and use cases so the
dashboard isn't empty on first run (it no-ops if you already have data).

## Environment variables

| Variable               | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`          | Postgres connection string                                    |
| `ANTHROPIC_ADMIN_KEY`   | Optional. Admin API key, enables "Sync real usage" (see below) |

On Vercel, `DATABASE_URL` has to be added by hand (step 4 above) —
connecting a database in the Storage tab doesn't always name its variable
`DATABASE_URL` on its own.

## Syncing real Anthropic usage

Instead of (or alongside) manually logging usage, you can pull a user's
actual spend straight from Anthropic:

1. In the [Anthropic Console](https://platform.claude.com), create an
   **Admin API key** (Settings → Organization → Admin API keys) — this
   requires being an organization admin/owner.
2. Set it as the `ANTHROPIC_ADMIN_KEY` environment variable (in Vercel:
   **Settings → Environment Variables**, same as `DATABASE_URL`; locally:
   in `.env`).
3. Give each pilot participant their own **workspace** in the Anthropic
   Console (Settings → Organization → Workspaces), and have them use an API
   key that belongs to that workspace for their pilot work.
4. On the Users page here, enter that workspace's ID (looks like
   `wrkspc_...`, found in the Console) under "Anthropic workspace" for the
   matching user.
5. Click **Sync real usage** — this pulls each linked user's month-to-date
   cost from the Anthropic Cost API and adds it to their spend total.

**Why a workspace per user, not just an API key:** Anthropic's Cost API can
only break spend down by workspace (or by cost-item description) — not by
individual API key — so workspace-per-user is what makes it possible to
attribute real dollar cost to the right pilot participant. Click "Sync real
usage" again any time to refresh; data usually shows up within a few
minutes of being incurred.

## Data model

- `User` — name, email, team, monthly budget, status (`active`/`blocked`),
  optional linked Anthropic workspace, and `syncedSpend` (real spend from
  the last sync).
- `UseCase` — name, description, owner (a `User`), budget cap, status
  (`active`/`paused`).
- `UsageEntry` — a manually logged amount against a user and, optionally, a
  use case. A user's total "spent" is their usage entries plus
  `syncedSpend`; a use case's is just its own usage entries (real synced
  usage is tracked per user, not per use case).

## Known limitations / next steps

- Real usage syncs per *user* only — a use case's spend is still manual,
  since Anthropic's Cost API can't break spend down below workspace level.
  If you need per-use-case real cost, the next step is giving each use case
  its own API key and tracking token counts via the Usage API (grouped by
  `api_key_id`) priced against Anthropic's published per-model rates, since
  the Cost API itself doesn't support that grouping.
- "Sync real usage" is a manual button, not automatic — click it whenever
  you want fresh numbers (or wire a cron job to `POST /api/sync-usage` if
  you want it automatic).
- No authentication at all — the app trusts whoever can reach it. Only run
  this somewhere private (your own machine, or a deployment locked down by
  network access / a reverse-proxy login) until real auth is added back.
- No audit log of who changed what.
- No email/Slack alerting yet — over-budget and blocked users only show up
  when someone opens the dashboard.
