# ADR 0004: Zero-Cost Portfolio Deployment

## Status

Accepted

## Context

QuestLearn needs a live, linkable demo for a portfolio — something a
reviewer can open without cloning the repo or running Docker locally.
The constraint that shaped every decision below, stated plainly
because it changed the outcome more than once: **the deployment must
cost $0/month, indefinitely, not just during a free trial window.**
That single constraint eliminated several designs that would otherwise
have been reasonable defaults, and getting to the final answer took
three real corrections, not a straight line. This ADR records that
path, not just where it ended up.

## Decision

### 1. Rejected: custom domain + Resend + Render cron

The first design assumed a small monthly budget was acceptable for a
portfolio piece: a custom domain (~$12/year), Resend for transactional
email (verification/reset — free tier exists but the plan was to use
paid deliverability once past its cap), and a Render Cron Job for
session cleanup. None of those are large costs individually, but once
the actual constraint was confirmed to be **exactly $0**, not "cheap,"
every one of them became disqualifying on its own:

- A custom domain has a mandatory recurring cost — no free tier
  exists for domain registration itself.
- Resend's free tier is real but still a per-provider account with its
  own limits and a paid tier waiting on the other side of them; a
  demo that depends on outbound email at all adds a second failure
  mode (deliverability, sender reputation) for a feature (email
  verification/reset) the demo doesn't actually need — the demo logs
  in as pre-seeded accounts, it doesn't register new ones.
- **Render Cron Jobs are a paid-plan-only feature** (confirmed against
  Render's own pricing/docs) — free-tier services cannot schedule cron
  jobs at all. This directly shaped the session-cleanup decision below
  (§7): if the reasonable-sounding "just run a nightly cleanup job"
  answer is unavailable at $0, the design has to solve the same
  problem a different way, not route around the constraint with a
  paid feature.

Rejected outright once $0 was confirmed as a hard floor, not a
target. This also settled the auth question: no self-registration
flow needs to work in the demo (see §7's guard design), so no email
provider is needed at all — logging in as the pre-seeded demo teacher
and demo learner accounts is sufficient, and it's free.

### 2. Rejected: Vercel (web) + Render (API) split hosting

The next design put Next.js on Vercel's free tier (a natural fit —
Vercel is Next.js's own platform) and the NestJS API on Render's free
tier, talking cross-origin. This is a common, reasonable-looking split
— and it was rejected for a concrete, verified bug, not a vague
"cookies are complicated" hand-wave.

**The bug:** the API's refresh/logout flow authenticates via an
`httpOnly` cookie (`refresh_token`), set with `SameSite=Lax` (Module
1's decision — `Lax` rather than `None` specifically because the app
was designed same-origin; `None` requires `Secure` and invites CSRF
surface a same-origin cookie doesn't need to defend against). Split
hosting makes every API call cross-origin from the browser's
perspective (`app.vercel.app` calling `api.onrender.com`). The
frontend's fetch calls already pass `credentials: "include"` — but
that only controls whether the browser *is willing* to attach or
accept cookies for a cross-origin request at all. It does not change
what the cookie's own `SameSite` attribute permits.

**Verified against MDN's own `Set-Cookie`/`SameSite` documentation:**
`SameSite=Lax` cookies are sent on top-level, same-site navigations
and on cross-site GET navigations that count as "safe" (e.g. clicking
a link), but they are **not sent on cross-site `fetch()`/`XHR`
requests** — a `fetch()` call, regardless of method, does not count as
a top-level navigation, so a `Lax` cookie is withheld from it whenever
the request is cross-*site* (different registrable domain, which
`app.vercel.app` vs. `api.onrender.com` is). `credentials: "include"`
does not override `SameSite` — it's a separate axis (does the browser
attach/accept cookies for this fetch's CORS mode at all) from what the
cookie's own attribute permits once it's under consideration. The
practical result: `/auth/refresh` would silently never receive the
refresh cookie in this topology, breaking session refresh — not an
edge case, the core session mechanism.

The fix that would have "worked" — `SameSite=None; Secure` — was
rejected too, not just as unnecessary but as a real downgrade: it
widens the cookie's CSRF exposure specifically to buy back a
split-origin topology this design doesn't need, in exchange for
solving a problem the single-origin design below doesn't have at all.
Weakening a security property to route around a topology choice, when
the topology choice itself isn't required by anything, is the wrong
trade.

### 3. Chosen: single-origin, one Render free Docker web service

One Render free-tier Docker web service running a single container
that owns the public `$PORT`. Inside that container: an internal
reverse proxy (built on `http-proxy` — see the measurement POC, §4)
in front of two internal processes — the NestJS API and the Next.js
standalone build — neither of which is directly reachable from outside
the container. The proxy's routing rule is exactly what the
measurement POC already validated: strip a leading `/backend` and
forward the remainder verbatim to the internal NestJS process;
everything else goes to the internal Next.js process.

This doesn't work around the cookie problem from §2 — **it eliminates
the question that caused it.** Browser, API, and cookie all share
`https://<the-one-Render-URL>` as their origin. `SameSite=Lax` behaves
exactly as it does in every environment this app has run in since
Module 1 (local dev, the existing combined-container measurement, CI)
because nothing about the origin relationship changed. No `SameSite`
loosening, no CORS configuration for a second origin, no split-domain
cookie scoping to get right.

Three things were verified, not assumed, before locking this in:

- **Zero collisions between NestJS's route table and `/backend`.**
  Checked every controller's route prefix against the reserved
  `/backend` segment — no existing route starts with, or could be
  confused with, `/backend`, so the strip-and-forward rule is
  unambiguous.
- **Zero frontend code changes.** `apps/web/src/lib/health.ts`'s
  `getApiUrl()` — and by extension every `fetch()` call in
  `lib/api.ts`, which all route through it — is plain string
  concatenation against `NEXT_PUBLIC_API_URL`. Setting that build-time
  value to `/backend` (a relative path) makes every existing fetch
  call resolve correctly against the same origin with zero changes to
  any component or API-client code. Confirmed during the measurement
  POC: all app pages are client components (`"use client"`), so this
  relative URL resolves in the browser against the page's own origin,
  never needing server-side base-URL resolution.
- **Zero disruption to the API test suite.** NestJS's own routes never
  move — `/backend` is a reverse-proxy concern that exists entirely
  outside the NestJS process. Every existing `supertest` integration
  test keeps hitting the API's real, unprefixed routes exactly as
  before; nothing in `apps/api/test/**` needed to change for this
  decision.

### 4. Memory feasibility: measured, not assumed

Before committing to "three processes in one 512MB container," this
was measured, not asserted. Full methodology and raw data:
`measurement/combined-runtime-poc` branch (not merged — a durable,
inspectable record of the underlying feasibility work, kept separate
from this ADR's own implementation).

Peak container memory (cgroup `memory.current`, sampled continuously
through cold start, idle, teacher/learner login+dashboard,
mastery/report pages, Swagger, and a 40-request concurrent burst):
**~185MB** (a transient cold-start reading), settling to
**149.8–160.3 MB** steady-state under load — against Render Free's
512MB limit, roughly **64–70% headroom**. Independently spot-checked
with a completely fresh `docker build` (new image ID) and fresh
`docker run`, watched live via `docker stats` for 87 seconds during
real driven traffic: 148.8–154.3 MB observed, landing squarely inside
the original range. This is the proof that a single 512MB instance is
actually viable, not an assumption the rest of this design depends on
without evidence.

### 5. Process supervision: Node as PID 1, `tini` as a defensive layer

The measurement POC's supervisor (`render-poc/entrypoint.js`) was
sufficient for a measurement — it doesn't need to survive a crashed
child gracefully, because a measurement run is manually restarted
either way. The production container needs actual supervision
discipline, which the POC deliberately didn't build (out of scope for
a feasibility measurement):

- **The entrypoint's own Node process is PID 1**, not a shell script —
  a shell script as PID 1 either doesn't forward signals to its
  children at all, or requires manually re-implementing signal
  trapping/forwarding to do so correctly; a real Node process can
  register its own `SIGTERM`/`SIGINT` handlers directly and control
  exactly how children are torn down.
- **`tini` is layered in front as `ENTRYPOINT`** (`node entrypoint.js`
  becomes tini's child, not the container's PID 1 directly) as a
  defensive extra on top of, not instead of, the app's own signal
  handling: `tini`'s specific job is reaping zombie processes (a
  concern that exists independently of how carefully the app-level
  supervisor is written, since Node itself doesn't reap orphaned
  grandchild processes for you) and guaranteeing correct exit-code
  propagation. Belt-and-suspenders, not redundant — each solves a
  different failure mode.
- **Readiness-gated startup**: the proxy does not begin accepting
  public traffic until both the API and web internal processes have
  confirmed readiness (the API's real startup log line / the web
  process's own "Ready" signal), rather than opening the public port
  immediately and hoping requests during the startup race either queue
  or 502 gracefully. A request arriving before both upstreams exist
  should never happen by design, not be tolerated as an acceptable
  edge case.
- **Exit-on-child-death**: if either the API or web child process
  exits for any reason, the supervisor treats that as fatal and exits
  itself (propagating a non-zero code) rather than continuing to serve
  traffic with one upstream silently gone — Render's own health
  checking and restart behavior is the correct recovery mechanism for
  a genuinely crashed process; silently proxying into a 502 forever is
  strictly worse than a clean, visible restart.

None of this was needed for the measurement POC, which only had to
answer "does it fit in memory" — production has to also answer "does
it fail safely," which is a different question with a different
design surface.

### 6. `DEMO_MODE`: default-deny mutation guard

A global NestJS guard, active only when `DEMO_MODE=true` (unset/false
in every other environment — local dev, CI, and any future non-demo
deployment are completely unaffected): every request whose method is
`POST`, `PATCH`, or `DELETE` is rejected with a `403` and a clear
message, **except** an explicit three-route allowlist: `/auth/login`,
`/auth/refresh`, `/auth/logout`.

Default-deny, not a denylist, because the safety property this guard
exists to provide — the public demo's shared, seeded data can't be
mutated by an anonymous visitor — has to hold even if a future module
adds a new mutating route and forgets to think about demo mode at all.
A denylist requires every future POST/PATCH/DELETE route to
*remember* to add itself to a blocked list; a default-deny allowlist
requires nothing from future code — it's safe by construction, and the
only routes that can ever bypass it are the three explicitly reviewed
and named here.

The three-route allowlist is exactly the demo's actual requirement:
visitors need to be able to log in as (and out of, and stay logged in
via silent refresh as) the pre-seeded demo teacher/learner accounts.
**Every other flow the demo needs to support — browsing classes,
questions, activities, mastery, reports, XP, quests — is a `GET`.**
Registering a new account, joining a class as a new anonymous learner,
creating/editing/archiving anything, and submitting a new attempt are
all real mutations the live app supports but the *demo* doesn't need
to, and all of them are correctly blocked by this guard without a
single route-specific exception.

### 7. Session self-pruning, not a scheduled cleanup job

Render Cron Jobs are paid-only (§1) — a nightly `DELETE FROM sessions
WHERE revoked_at IS NOT NULL OR expires_at < now()` job, the
reasonable-sounding default answer, is unavailable at $0. Rather than
solving a scheduling problem the platform doesn't offer for free, the
cleanup is folded into work that already happens on every login and
refresh: **`issueSession` now deletes the issuing user's own
already-revoked or already-expired `Session` rows in the same
operation that creates the new one.**

This is deliberately **not gated behind `DEMO_MODE`.** It's a general
correctness improvement independent of the demo: `Session` rows
already accumulate one per login and one per refresh-rotation
(refresh revokes the old row and issues a new one — see
`auth.service.ts`'s `refresh()`), and nothing before this change ever
removed the revoked trail. Bounded per-user session growth is a
property every deployment benefits from, not a demo-specific
workaround — so it ships everywhere, always on, rather than as a
demo-only code path that would need to be remembered and re-verified
if the demo mode flag is ever removed.

This isn't a full replacement for a proper scheduled sweep at real
production scale (a user who never logs in again keeps their stale
sessions forever, since nothing prompts a prune for them) — but for a
zero-cost portfolio demo with pre-seeded accounts that log in
repeatedly, it fully closes the actual growth path, at zero
infrastructure cost, with no new moving parts.

### 8. `/health`: 503 on database disconnection, 200+degraded on Redis-only

Already-approved finding from earlier in this process, implemented
here: `GET /health` now returns a genuine `503 Service Unavailable`
when the database is unreachable — a platform health check (Render's
own, or any external uptime monitor) should be able to tell "this
instance cannot serve real requests" from a plain HTTP status code,
not have to parse the JSON body to find out. Redis-only disconnection
stays a `200` with a `degraded: true` flag in the body: Redis backs
rate limiting, not any request's core correctness, so an instance that
can still reach its database is still meaningfully "up" even if
degraded — collapsing that into the same 503 as a real database outage
would make the health check less informative, not more.

### 9. Migration strategy: GitHub Actions release step (Option B)

Two options were considered for running `prisma migrate deploy`
against the production database on every release:

- **Option A — Render's pre-deploy command.** Rejected: **confirmed
  against Render's own pricing/docs that pre-deploy commands are a
  paid-plan-only feature**, unavailable on the free tier this whole
  deployment is built around. Same category of rejection as Render
  Cron Jobs in §1 — a platform feature that would be the obvious
  default answer, gated behind a plan this design cannot use.
- **Option B — a GitHub Actions release step.** Chosen. A workflow
  gated on the existing CI job passing first runs `prisma migrate
  deploy` against the production Neon database (connection string from
  a repo secret), then issues a `POST` to Render's deploy hook URL
  (also a repo secret) to trigger the actual deploy. This runs
  migrations from CI's own compute, which is free, and keeps "tests
  must pass" and "schema must migrate cleanly" as two required gates
  in front of every production deploy rather than letting either one
  be skipped.

### 10. Neon over Render Postgres; Upstash over Render Redis

Render's bundled free-tier Postgres and Redis add-ons both **expire
after 30 days** and are deleted, not merely paused — a hard
disqualifier for a portfolio demo that needs to stay up indefinitely,
not for a month. Neon (Postgres) and Upstash (Redis) both offer
free tiers with no such expiry, so the database and cache layers are
provisioned there instead, decoupled from Render entirely — Render
hosts only the combined web service container from §3.

## Consequences

- The production topology is: one Render free Docker web service
  (the combined container) talking to a Neon Postgres database and an
  Upstash Redis instance, both external to Render. No custom domain,
  no email provider, no Render Cron Job, no Render add-ons.
- `Dockerfile.combined` (the hardened production version of the
  measurement POC's `Dockerfile.combined-measurement`) adds `tini` as
  `ENTRYPOINT`, readiness-gated proxy startup, and exit-on-child-death
  — none of which the measurement POC needed, all of which production
  does.
- `DemoModeGuard` is a new global guard, active only when
  `DEMO_MODE=true`; every other environment is unaffected by its
  existence.
- `issueSession`'s self-pruning behavior ships unconditionally, in
  every environment, not just when `DEMO_MODE=true`.
- `/health`'s status code is now meaningful to automated tooling, not
  just its JSON body — a documented, intentional change to an
  existing endpoint's contract (503 is new; every prior caller that
  only read the JSON body is unaffected, since the body shape is
  additive).
- Frontend: `NEXT_PUBLIC_API_URL=/backend` in the production build,
  `NEXT_PUBLIC_DEMO_MODE=true` in the demo deployment specifically (a
  separate, orthogonal flag — a non-demo deployment of this same
  container would set `NEXT_PUBLIC_API_URL=/backend` but leave
  `DEMO_MODE`/`NEXT_PUBLIC_DEMO_MODE` unset).
- A new GitHub Actions release workflow runs after CI passes,
  requiring two new repo secrets (the Neon production `DATABASE_URL`
  and Render's deploy hook URL) that don't yet exist — provisioning
  Render/Neon/Upstash and supplying those secrets is explicitly out of
  scope for this ADR's implementation, left to be wired in once the
  services are actually provisioned.
- README gains a "Live Demo" section (URL to be filled in once
  provisioned) stating the public-demo limitations (read-only, three
  allowlisted auth routes, everything else a 403) and disclosing
  Render free-tier cold starts honestly rather than letting a
  reviewer hit a slow first load unexplained.
