# ADR 0005: Static Mock Frontend Demo

## Status

Accepted

## Context

ADR 0004 committed to a zero-cost, live-backend deployment: one Render
free Docker web service (the combined `Dockerfile.combined` runtime)
talking to external Neon (Postgres) and Upstash (Redis) free tiers.
That implementation — `Dockerfile.combined`, `DemoModeGuard`, session
self-pruning, the `/health` contract, the release workflow — was built,
tested, and merged (Module 10.4). Provisioning proceeded from there:
Neon and Upstash were both created and verified live (migrations
applied, demo data seeded and independently re-queried from Neon
directly). Render was the last piece.

Render's `POST /v1/services` rejected the free-plan service creation
with a genuine `402 Payment Required` — "Payment information is
required to complete this request" — confirmed against Render's real
API (not a client-side or documentation misunderstanding: the request
carried Render's own infrastructure headers in its response). This
is a hard constraint, not a workaround-able one: entering payment/card
details is something this process never does on the user's behalf,
regardless of who asks. Checked whether this was Render-specific
before treating it as a platform-wide blocker: Fly.io and Koyeb's
current free tiers were checked the same way, against their own
current docs, and both now require a card for fraud prevention before
provisioning any service, free or paid. **Every backend-hosting
platform actually checked requires a card, even for $0 usage.** The
project's constraint has been $0 *and* no-card from the start (ADR
0004's §1: Resend/custom-domain/Render-cron were rejected once the
constraint became exactly $0) — a card-required free tier fails that
constraint just as certainly as a paid tier would, even though the
literal dollar amount charged would be zero.

The original zero-cost architecture planning already anticipated this
exact failure mode and defined a fallback for it: *a read-only
interactive frontend demo backed by deterministic seeded/mock demo
data that demonstrates the entire UX sequence, while the real
NestJS/Postgres implementation remains fully available and tested in
the repository.* This ADR is that fallback, exercised.

## Decision

- **This is an additional deployment path, not a replacement.**
  Everything from Module 10.4 — `Dockerfile.combined`,
  `DemoModeGuard`, session self-pruning, `/health`'s 503/degraded
  contract, the GitHub Actions release workflow, ADR 0004 itself —
  stays exactly as merged. Neon and Upstash remain live and correctly
  provisioned; nothing about them is undone. If a card-free (or
  card-accepted) backend host becomes available later, ADR 0004's
  design deploys as-is with no changes required. This ADR adds a
  second, independent way to demo the product; it does not revert or
  supersede the first.

- **Static-exported build of the real Next.js app**, reusing the
  actual pages and components rather than a separate hand-built demo
  UI. A `STATIC_DEMO` build-time flag switches two things, and only
  two: `next.config.js`'s `output` mode (`"export"` instead of the
  default server/standalone build), and, via webpack alias, which
  data-layer module the app's pages import — the real `lib/api.ts`
  (network calls) is swapped for `lib/mock/mock-api.ts` (synchronous,
  in-memory mock data). Every page component, every piece of UI, every
  design-system component is the exact same code that talks to the
  real backend in every other build. `lib/api.ts` and
  `lib/auth-context.tsx` are untouched by this ADR — the alias points
  *away* from them in the static-demo build only; every other build
  variant (local dev, CI, Module 10.4's Docker image) still resolves
  to the real files exactly as before.

- **Mock data is derived from the actual seeded demo data**, not
  invented. `apps/api/prisma/seed.ts` (Module 10.2/10.3's real seed
  script) and the live re-query already run against Neon during
  Module 10.4's provisioning are the source: the same demo teacher/
  learner names, the same classes, questions, and concepts, the
  concept that genuinely reaches Mastered through 3 real submitted
  assignments (Module 10.2's fix), and roster/assignment shapes that
  reflect Module 10.3's point-in-time reporting model. The static
  demo shows a real, internally-consistent, already-tested application
  state — a frozen snapshot of it — not placeholder content invented
  for the demo alone.

- **No authentication.** A landing page offers "View as Teacher" /
  "View as Learner," which sets a plain in-memory/localStorage role
  flag and routes straight into the dashboard — no JWT, no cookies, no
  login form, no password. This is not a weakened version of the real
  auth system; it's the correct design for a build with no backend to
  authenticate against at all.

- **No mutation handling, but `DemoModeAction` is reused, not
  reinvented — and its coverage is now complete, verified against the
  built static export, not assumed from Module 10.4.** Unlike
  `DemoModeGuard` — a default-deny guard that has to actively reject
  real mutating requests a live backend could otherwise execute — the
  static demo has no backend to send a mutation to in the first place:
  `mock-api.ts`'s mutating exports are all `NOT_WIRED`, a stub that
  throws. Pages whose entire purpose is a mutation (create-class,
  create-question, assign, etc.) are simply not part of this build's
  navigation. But several *included* read-mostly pages still render
  individual mutating controls inline (rename, archive, rotate join
  code, add/remove roster, quest steps, concept tags) alongside their
  read-only content — and those controls are real, focusable,
  clickable elements. Originally this ADR planned to leave that to
  `NOT_WIRED`'s throw with no further handling, on the theory that no
  page in the demo's navigation would call them. That theory was
  wrong twice over, both times found by actually clicking through the
  *built* static export rather than trusting the source:
  1. Clicking "Remove roster entry" produced an unhandled promise
     rejection with zero visible feedback. Fixed by extending Module
     10.4's `DEMO_MODE` flag (`lib/demo-mode.ts`) to also cover
     `NEXT_PUBLIC_STATIC_DEMO`, so every `Button` already wrapped in
     `DemoModeAction` — class detail, activity builder, question
     detail's Archive — is correctly disabled with the explanatory
     tooltip, reusing Module 10.4's exact treatment rather than
     inventing a second one.
  2. Two further surfaces were reachable but *not* wrapped in
     `DemoModeAction` at all: question detail's concept-tag add
     (`Select`) and remove (`Tag`'s `×`), and every quest-builder step
     control (Up/Down/Remove/Add step/Archive). Concept-tag add/remove
     threw the same unhandled-rejection pattern as roster removal.
     Quest-builder's controls did *not* throw uncaught — its
     `withBusy` wrapper already has a `try/catch` — but surfaced a
     generic "Something went wrong. Please try again." with no
     indication this was a demo boundary rather than a real failure,
     which is not one of the three sound end states (disabled, hidden,
     or genuinely functional) either. Fixed by wrapping both in
     `DemoModeAction`, which required adding a `disabled` prop to the
     shared `Select` and `Tag` design-system components first (neither
     accepted one; wrapping them unchanged would have set a `disabled`
     prop they silently ignored, looking fixed without being fixed —
     caught by re-checking the built export's actual DOM state after
     the first attempt, not by reading the diff). Both additions are
     backward-compatible (default `undefined`/falsy, every existing
     call site unaffected) and verified via every other consumer
     (`QuestionForm`'s accepted-answers `Tag`, the assign form's class
     `Select`) still building and passing e2e unchanged.
  These gaps were Module 10.4 gaps, not introduced by this ADR — the
  same controls are equally unprotected against a real 403 in ADR
  0004's live-backend demo, since their handlers also lack a `catch`
  (quest-builder) or any error handling at all (concept tags). Fixing
  the underlying pages for ADR 0004 is out of scope here and is
  reported separately; fixing their *static-demo* symptom was in
  scope because the static demo has no `DemoModeGuard` 403 as a
  fallback safety net the way ADR 0004 does — an unwrapped control
  here has no server backstop at all, so "unprotected" here means
  something categorically worse than "unprotected" there.

- **Every navigation link visible on an included page resolves to a
  real page in the static export — verified by clicking through the
  built export, not by reading which pages `generateStaticParams`
  covers.** `output: "export"` only pre-renders the exact param values
  each dynamic route's `generateStaticParams` returns; several
  mutation-only pages (edit, assign, preview, attempt, learner-report)
  were deliberately excluded and given a single placeholder
  `id: "unused"` param so the build itself succeeds. That's correct
  for those pages in isolation, but three *included* pages still
  linked into them with the real id, not `"unused"` — Question
  detail's "Edit", Activity detail's "Preview"/"Assign", and the
  learner dashboard's assignment rows — which loaded fine locally
  under `next dev`'s server-side dynamic routing but 404 on GitHub
  Pages' static file serving, confirmed by actually navigating to one
  in the built export. Two of the destinations turned out to be
  entirely read-only under closer inspection — `/attempts/[id]/result`
  (no autosave, no submit, just a graded attempt's review) and
  `/classes/[id]/learners/[learnerId]/report` (a teacher's read-only
  composite view, no button on it does anything) — so those were
  *un-excluded*: given real `generateStaticParams` for the real
  seeded attempt/learner ids, and their `mock-api.ts` stubs
  (`getAttempt`, `getLearnerReport`) wired to real derived data
  (`MOCK_ATTEMPT_DETAILS`, `MOCK_LEARNER_REPORT` in `mock-data.ts`,
  built the same way as every other mock export — composed from this
  file's own already-real values, not invented) instead of
  `NOT_WIRED`. The one genuinely mutation-only destination among them
  — `/questions/[id]/edit`, a full edit form — and the
  activity-detail "Preview"/"Assign" links to their still-excluded
  destinations were left excluded, with the *link* itself swapped for
  the same disabled-with-tooltip treatment as every `DemoModeAction`
  control, rather than a link to nowhere. The dashboard's "in
  progress" branch (linking to the still-excluded
  `/assignments/[id]/attempt`) is unreachable given the current mock
  data (every seeded assignment is submitted) but was guarded the same
  way defensively, so a future data change can't silently reopen this
  exact class of bug.

- **Hosted on GitHub Pages.** The repository is already public, so
  this is zero new signup and zero card risk — the one hosting option
  in this entire investigation that doesn't ask for payment
  information before serving a single static file.

## Consequences

- Two independent, documented ways to see QuestLearn running: this
  static demo (live now, zero backend dependency) and ADR 0004's
  live-backend deployment (code-complete and provisioned up through
  Neon/Upstash, blocked only on a card-requiring host — deployable
  immediately once that's resolved, with no further code changes).
- The static demo's coverage is real-page/real-component but
  necessarily partial: it covers the read-only browsing surface
  (dashboards, classes, questions, activities, mastery, reports,
  gamification, quests, attempt results, learner reports) that
  `mock-api.ts` was actually written for, not literally every route in
  `lib/api.ts`. Which pages are covered and which aren't is stated
  plainly in the implementation report, not left to be discovered by a
  broken link — and every link an included page actually renders was
  verified, in the built export, to land on one of those covered pages
  rather than a 404.
- `apps/api` (the real backend, its 309 tests, its integration test
  suite against real Postgres/Redis) is entirely unaffected — this
  ADR is frontend-only.
- README gains a second "Live Demo" link (or a clarified single
  section covering both), distinguishing "static demo, always on, no
  backend" from "full live-backend deployment" so a reviewer
  understands which one they're looking at.
