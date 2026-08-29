# Testing Report

What's actually been verified, and how — not a coverage aspiration.
Current as of Module 10.3 (Domain Correctness: Point-in-Time
Assignment Roster Reporting), following Module 10.2 (Mastery Evidence
Gating) and Module 10 (Security, Accessibility, and Production
Hardening).

## Test suites

- **Jest — unit + integration, `apps/api`**: 32 suites, 288 tests, run
  against real Postgres/Redis (via `docker-compose`), not mocks, for
  every integration spec. Covers: auth session lifecycle, classes
  lifecycle + join-code race retry, questions lifecycle + versioning +
  option-id uniqueness, activities lifecycle + publish atomic-claim +
  concurrency proof, the full assignments/attempts lifecycle
  (including the submit idempotency and frozen-content proofs),
  mastery evidence/recalculation (including its own idempotency proof,
  a recency-weighting test — newer evidence carries proportionally
  greater influence than older evidence, not "decay" — and the
  evidence/distinct-attempt-count gate's boundary cases from Module
  10.2), gamification XP/badge awarding (including its own idempotency
  proof), quest CRUD/gating/reward (including its own concurrency
  proof, reworked in Module 10.2 to stage the "mastered" gate across
  the now-required 3 distinct attempts instead of 1), all four
  reporting endpoints against a hand-checkable fixture (plus CSV
  formula-injection escaping), point-in-time assignment roster
  reporting as of Module 10.3 (leave→rejoin reconstruction, late-join
  submissions, roster churn between assignments, all driven through
  real HTTP join/leave/rejoin/assign/submit calls, in its own
  `point-in-time-roster-reporting.integration.spec.ts`), tenant
  isolation across every module with resources to isolate, and rate
  limiting (auth + join-code redemption + the app-wide default).
- **Jest — `apps/web`**: 3 tests, a render smoke test for the status
  page (loading/connected/degraded states).
- **Playwright — `apps/web/e2e`**: 48 tests across 10 spec files,
  driving real browser journeys against the real running app (not
  component mocks): auth (register → verify → login → dashboard →
  logout), classes (create → roster → rotate), question bank
  (create → edit → preview), activities (build → order → preview →
  publish → immutability), assignments/attempts (assign → join →
  attempt → submit → result), mastery (tag → assign → attempt with
  hint → learner/teacher views), gamification (assign → join →
  attempt → xp/badges), quests (build → steps → learner progress),
  and reporting (dashboard → question analysis → learner report,
  including a real CSV download). Every module's Playwright flow
  passes in CI (§20's Definition of Done requirement).

## §16 "before public pilot" checklist

The spec's pre-pilot checklist, and what's actually been done for
each item — several were already covered by ongoing module-by-module
verification discipline, not new to Module 10:

| Item | Status | Notes |
|---|---|---|
| Dependency audit | **New, Module 10** | `pnpm audit --prod`: 44 → 1 (deferred, documented). See `SECURITY_NOTES.md`. |
| Container build | **New, Module 10** | No Dockerfile existed before this module. Built both, verified end-to-end against real containers on the real docker-compose network — see below. |
| Security scan | **New, Module 10** | The dependency audit above, plus the headers/CSP work — no dedicated SAST/DAST tool run (out of scope for this project's scale; the audit + manual CSP verification is the scan). |
| Accessibility test | **New, Module 10** | Manual keyboard-only walkthrough + computed-contrast verification, not an automated a11y test suite — see `SECURITY_NOTES.md`'s accessibility section for what was found and fixed. |
| Full Playwright suite | **Already covered** | Every module since Module 1 has required its Playwright flow to pass in CI before merge; re-run once more in this module's final verification pass, not new discipline. |
| Migration smoke test (fresh volume) | **Already covered** | Established practice since the Module 9 audit-fixes PR (`docker compose down -v && up`, fresh `prisma migrate deploy`, fresh seed); re-run once more here as this module's final gate. |
| Production build test | **Partially new** | Manually run (`next build && next start`, `nest build && node dist/main.js`) for every prior module's Playwright verification; Module 10 additionally proves the *containerized* production build end-to-end, which is the genuinely new piece. |

## Module 10 verification specifics

Each fix in this module was verified individually before being
committed, not just bundled into one final pass:

- **Dependency overrides** (`pnpm-workspace.yaml`): full
  typecheck/lint/test (269 API + 3 web) re-run clean after applying,
  before the Next.js bump was even started.
- **Next.js 14→15 bump**: isolated in its own commit per the plan's
  risk-sequencing. Full typecheck, lint, production build, full Jest
  suite, and the full 48-test Playwright suite against the production
  build — all clean. `pnpm audit --prod` re-checked: 27 → 1.
- **Helmet + CSP (API)**: verified in a real browser that Swagger UI
  at `/api/docs` renders its full endpoint list with zero console
  errors under the relaxed per-path CSP; curl-verified both CSP
  headers resolve to exactly the directives written, not
  silently-merged helmet defaults. Full API test suite re-run clean.
- **Security headers + CSP (web)**: verified in a real logged-in
  browser session (login → dashboard → classes, real API data
  rendering) with zero CSP-refusal console messages; confirmed
  `connect-src` correctly refuses an arbitrary `fetch()` to an
  unlisted origin. Full 48-test Playwright suite re-run against the
  production build with these headers active.
- **Input focus-visible fix**: verified via
  `getComputedStyle(document.activeElement)` after a real Tab
  keypress in a real browser session, confirming the outline actually
  renders (`rgb(79, 63, 224) solid 2px`, 2px offset), not just that
  the CSS compiles. Also captured as a real before/after screenshot
  pair (`docs/screenshots/10-hardening/`) — not spec-required (§14
  lists no screenshot for Module 10), added anyway as visual evidence
  alongside the computed-style proof.
- **Switch/Tag keyboard fixes + contrast fixes**: contrast values
  computed via the real WCAG relative-luminance formula (not
  eyeballed), then confirmed live via `getComputedStyle` that the new
  token values actually resolve in the rendered app. Full Jest suite,
  design-system lint/typecheck, and the full Playwright suite (which
  exercises the mastery flow's `Badge` status tones) re-run clean.
- **Docker images**: built both, then proved the real end-to-end path
  — ran both as containers on the actual docker-compose network,
  confirmed `/health` resolves database/redis as connected from
  inside the API container, then logged in through a real browser
  against the containerized web app talking to the containerized API
  and reached the authenticated dashboard. Not just "`docker build`
  exited 0."
- **`WEB_URL` required**: full API test suite re-run clean after the
  schema change (verified no test relies on the old optional/
  permissive-CORS-fallback behavior).

## Fresh-environment re-verification (final gate)

Before opening the PR for this module, per the same discipline used
for every prior module:

1. `docker compose down -v && docker compose up -d` — genuinely fresh
   Postgres/Redis volumes, not reused state.
2. `prisma migrate deploy` from zero — all 8 migrations apply clean.
3. `pnpm --filter @questlearn/api seed` — demo data loads clean.
4. Full Jest suite (both apps) against the fresh database.
5. Full Playwright suite (48 tests) against a real production build
   (`next build && next start`, `nest build && node dist/main.js` —
   never `next dev`/`nest start --watch`, since React StrictMode's
   dev-only double-invoke behavior would mask real issues).
6. Both Docker images built and run as real containers, end-to-end
   login proof through the browser.

## Module 10.2 — Mastery Evidence Gating

Domain-correctness fix: mastery state is now additionally gated by a
minimum evidence-row-count and minimum-distinct-attempt-count per
state (score thresholds, the 14-day recency half-life, and the 15%
hint penalty are all unchanged). All gating logic is centralized in
`mastery-formula.ts`/`mastery.service.ts`; `quests.service.ts`,
`quest-formula.ts`, and `gamification.service.ts` required zero
production-code changes, since they only ever consumed the returned
`state` string.

- **`mastery-formula.spec.ts`** — 9 new unit tests: `distinctAttemptCount`
  (unique-attempt counting, empty-evidence case) and `stateForEvidence`
  boundary cases for every state, including the original "two questions
  in one sitting" defect (score 0.925, 2 evidence rows, 1 attempt →
  capped at Developing, not Mastered) and a proof the gate never
  promotes a state above what the score alone justifies.
- **`mastery.integration.spec.ts`** — existing assertions updated to
  the now-correctly-gated states (single evidence row: Proficient →
  Beginning; two evidence rows from one attempt: Mastered →
  Developing), plus two new tests proving a second distinct attempt is
  still insufficient (capped at Proficient) and a third distinct
  attempt genuinely reaches Mastered — both driven through the real
  HTTP submit path, not hand-inserted evidence.
- **`quests.integration.spec.ts`** — the "reaching mastered completes
  step 2" scenario extended from 1 to 3 distinct assignments/attempts
  on the mastery-source concept, with a new intermediate test proving
  2 of the 3 needed attempts is not enough.
- **`quests-concurrency.integration.spec.ts`** — the race proof's
  premise no longer holds as written (a single full-credit response
  can no longer reach Mastered on its own), so it was restaged: two
  sequential pre-race attempts bring the concept to 3 evidence
  rows/2 distinct attempts (short of Mastered), then two further
  attempts are submitted concurrently, each independently computing
  4 evidence rows/3 distinct attempts and crossing the gate — the
  same `QuestCompletion` unique-constraint race this test exists to
  prove, just staged to actually reach the state gate under the new
  rule.
- **`seed.ts`** — extended with a second, narrower published activity
  ("Solar System Mastery Check", 2 questions) and two additional
  submitted assignments/attempts against it, all routed through the
  real `MasteryService.recordEvidenceForAttempt` /
  `GamificationService.awardForAttempt` path (no hand-inserted
  `MasteryEvidence` rows), so the demo learner reaches one genuinely
  Mastered concept (Solar System Basics: 6 evidence rows across 3
  distinct attempts) under the new gate. The Number Theory concept
  used by the existing demo quest is untouched by these additions, so
  that quest's step-2 "unlocked but not yet met" demonstration is
  unaffected.
- **Frontend** — `ConceptMastery` gained `evidenceCount`/
  `distinctAttemptCount`; both the learner `/mastery` page and the
  teacher `/classes/:id/mastery` page now show a short note (e.g.
  "Score 0.98 · 2 of 3 attempts needed for Mastered") whenever the raw
  score would justify a higher state than what's reported, computed
  client-side in `lib/api.ts`'s `masteryGateStatus`.
- **Verification note**: the full suite was executed against real
  Postgres/Redis containers (`docker compose up -d`, migrated and
  reseeded from zero) and a real production build (`nest build` +
  `node dist/main.js`, `next build` + `next start`) —
  `pnpm --filter @questlearn/api test`: **31 suites, 281 tests, all
  pass**; `pnpm --filter @questlearn/web test`: **3/3 pass**;
  `pnpm --filter @questlearn/web e2e` (Playwright, 48 tests): **48/48
  pass**, including the auth email-verification flow that reads the
  API's `dev.log`. (An earlier verification pass in this same effort
  did run the suites but left this note un-updated from a draft
  written before Docker was confirmed reachable — that was a
  documentation lag, not a case where the suites genuinely didn't
  run; this note reflects the actual, current, re-executed results.)

## Module 10.3 — Point-in-Time Assignment Roster Reporting

Domain-correctness fix: `assignedCount`/`submittedCount`/
`completionRate` on the teacher dashboard and CSV export are now
computed as of each assignment's own `createdAt` instant from the
existing `RosterEntry.addedAt`/`removedAt` history, instead of from
the class's current roster reused for every assignment regardless of
age. No schema migration (see `docs/adr/0003-point-in-time-assignment-roster-reporting.md`
for the full decision record, including the rejected
`AssignmentRecipient` snapshot-table alternative).

- **`reports.service.ts`**: `buildAssignmentRows` replaced the single
  shared `activeRosterCount` query with one fetch of all `RosterEntry`
  rows for the class (including removed ones) and one fetch of all
  assignments-with-attempts, computing each assignment's point-in-time
  cohort in application code — no N+1 query pattern. New field
  `lateJoinSubmittedCount` on `AssignmentReportRow`, and a 5th CSV
  column ("Late-Join Submissions").
- **`reports.integration.spec.ts`**: the shared fixture's roster
  entries were reordered to join BEFORE the assignment is created
  (matching real usage — build a roster, then assign work to it) —
  under the old always-current-roster logic the order never mattered,
  but the new point-in-time logic correctly excludes anyone who joins
  after an assignment already exists, so a fixture that joined
  learners after assignment creation would now (correctly) report
  `assignedCount: 0` for it. CSV header/assertions updated for the new
  column.
- **New `point-in-time-roster-reporting.integration.spec.ts`** (7 new
  tests; the reports suite as a whole — this file plus
  `reports.integration.spec.ts` and `report-formula.spec.ts` — is now
  36 tests total): a dedicated fixture
  driven entirely through real HTTP calls (join, teacher-remove,
  rejoin, assign, start, submit — never hand-inserted roster or
  assignment rows) proving: (1) a learner removed from the roster is
  excluded from an assignment created during the gap, but included
  again once they rejoin (a genuinely new `RosterEntry` row — asserted
  directly: exactly 2 rows exist for that learner, one removed, one
  active) and a later assignment is created; (2) the earlier
  (during-the-gap) assignment's numbers are unaffected by the later
  rejoin, proving each assignment's cohort is independently computed
  from its own `createdAt`; (3) a learner who joins after an
  assignment already exists can still submit it (unchanged —
  `AttemptsService.start()` only checks current roster status), but
  is excluded from `assignedCount`/`submittedCount` and captured in
  `lateJoinSubmittedCount` instead, with `completionRate` staying
  exactly 100% rather than inflating past it; (4) the CSV export
  reflects the new column with the real, nonzero late-join count.
- **Frontend**: `AssignmentReportRow` gained `lateJoinSubmittedCount`;
  `apps/web/src/app/classes/[id]/report/page.tsx` shows a note only
  when it's nonzero — the common case (no roster churn between
  assignment creation and submission) is visually unchanged, verified
  by the full Playwright suite still passing unmodified against the
  seeded demo data (which has no late joiners).
- **Verification**: real run, this session — `docker compose up -d`,
  real production builds (`nest build`/`node dist/main.js`,
  `next build`/`next start`), demo tenant reset and reseeded from
  zero. `pnpm --filter @questlearn/api test`: **32 suites, 288 tests,
  all pass**; `pnpm --filter @questlearn/web test`: **3/3 pass**;
  `pnpm --filter @questlearn/web e2e` (Playwright, 48 tests): **48/48
  pass**.
- **Unrelated finding, logged as backlog, not fixed here**:
  `Assignment.archivedAt` is dead — several read paths filter on
  `archivedAt: null`, but no code anywhere ever sets it (unlike every
  other archivable model in the schema, which all have a real archive
  mutation). See ADR 0003's Consequences section.

## Module 10.4 — Zero-Cost Portfolio Deployment

Full decision record: `docs/adr/0004-zero-cost-portfolio-deployment.md`.
Memory feasibility for the combined single-container runtime was
measured and independently spot-checked separately — see the
`measurement/combined-runtime-poc` branch, not this module's own
suite.

- **`DemoModeGuard`**: unit-tested directly (`demo-mode.guard.spec.ts`
  — path-exactness, all three mutating HTTP methods, the allowlist's
  three exact routes, and that `/auth/register` is deliberately NOT
  allowlisted) and proven end-to-end over real HTTP with `DEMO_MODE=true`
  (`demo-mode.integration.spec.ts` — login/refresh/logout pass through,
  POST/PATCH/DELETE to real routes 403 with the read-only message, GET
  is never blocked), built with `DEMO_MODE` set before the app compiles
  and restored afterward so it can't leak into other test files
  sharing the same Jest worker.
- **Session self-pruning**: `session-pruning.integration.spec.ts`
  drives real register/verify/login HTTP calls, hand-inserts the
  revoked/expired rows a login can't produce on demand, and proves a
  subsequent login deletes only this user's own stale rows (a
  still-valid session survives; another user's revoked session is
  untouched). `auth.service.spec.ts`'s Prisma mock updated for
  `issueSession`'s new array-form `$transaction`.
- **`/health` 503/degraded**: `health.controller.spec.ts` (new) proves
  the controller's status-code behavior specifically — 200 when
  connected, 200 with `degraded:true` for Redis-only disconnection, a
  503 `HttpException` carrying the full report body for database
  disconnection. `health.service.spec.ts` extended for the `degraded`
  field's computation.
- **`Dockerfile.combined`**: built and run for real (not just
  typechecked) — confirmed live: `tini` as PID 1 (`ps aux` inside the
  running container), the proxy does not open its public port until
  both `waitForReady()` checks resolve (logged, and a request against
  the public port before that point would find nothing listening),
  and killing the API child process took the whole container down
  (exit code 1) rather than leaving the web process silently serving
  behind a dead API.
- **Full suite, real run this session**: `pnpm --filter @questlearn/api
  test`: **36 suites, 309 tests, all pass** (up from 32/288 — this
  module added `demo-mode.guard.spec.ts`, `demo-mode.integration.spec.ts`,
  `session-pruning.integration.spec.ts`, `health.controller.spec.ts`).
  `pnpm --filter @questlearn/web test`: **3/3 pass**. Both apps'
  `tsc --noEmit`: clean. `pnpm --filter @questlearn/web e2e`
  (Playwright, 48 tests, real production build, DEMO_MODE unset):
  **48/48 pass** — confirms the new global guard and the layout-level
  banner don't change behavior at all when demo mode is off. The
  demo-mode web build was separately verified to actually render the
  banner (`grep`-confirmed in the served HTML) before rebuilding
  normally to restore the workspace's non-demo `.next` output.
- **Frontend coverage note, not a gap silently left out**: `DemoModeAction`
  wraps every control named in this module's brief (Create Class, Add
  Question — shared by both create and edit via `QuestionForm`, Create
  Activity, Assign, Edit, Archive) plus several more mutating controls
  on the same pages while already there (activity question add/remove/
  reorder/publish, class rename/roster add/remove/join-code rotate).
  It does **not** yet cover every mutating control across the entire
  app (e.g. concept tagging's `Select`/`Tag` controls on the question
  detail page, quest step management, attempt start/submit) — those
  remain safely blocked server-side by `DemoModeGuard` regardless
  (defense in depth: the guard is the actual enforcement, the frontend
  wrapper is a UX layer on top of it), just without the same
  proactive "disabled, here's why" treatment yet. Worth a follow-up
  pass if broader frontend coverage is wanted. **Update, Module 10.5**:
  the concept-tagging and quest-step-management half of this gap is
  closed — see that module's section below. `DemoModeAction` now wraps
  both, in the shared page source both builds use, so this build gets
  the same proactive treatment as a side effect. Attempt start/submit
  remains unwrapped (that page stays excluded from the static demo
  entirely, see below), still safely blocked server-side here.

## Module 10.5 — Static Mock Frontend Demo

Full decision record: `docs/adr/0005-static-mock-frontend-demo.md`.
This module is frontend-only and additive: Module 10.4's live-backend
deployment path is untouched, and `apps/api`'s suite (below) is run
unmodified as a regression check, not because this module changed
anything there.

- **Observed CI anomaly, root-caused, real fix landed** (not a
  workaround, not silently dismissed as flakiness): [PR #20](https://github.com/SeifHegazy53/questlearn/pull/20)'s
  CI failed three consecutive times with an identical signature — the
  same 8 tests (every one that creates a resource and loads its own
  dynamic detail page: `activities`, `assignments-attempts`, `classes`,
  `gamification`, `mastery`, `questions`, `quests`, `reports`), each
  timing out at the same 5s/30s boundary, byte-for-byte identical
  durations across all three runs. A from-scratch reproduction in a
  real Ubuntu container (same Node version, full `pnpm -r build`, a
  genuinely fresh seeded database, run both unconstrained and capped
  to the runner's own 2 vCPU/7GB) passed cleanly every time, ruling
  out this module's own application logic and general runner health
  (the same run's own 309-test Jest suite against the same Postgres,
  seconds earlier, was fast and clean). A first fix attempt — a
  "warm up dynamic routes" CI step, on the theory that this was a
  first-render/compile cost — made *zero* measurable difference on
  the next run, which itself was informative: it ruled that theory
  out. Capturing the actual server logs and Playwright traces from a
  real CI run (a temporary diagnostic artifact upload, since neither
  is visible in the plain job log) found the real cause: Next.js's
  own internal `NoFallbackError`, thrown because every one of this
  module's 13 dynamic-route wrapper pages returns a genuinely empty
  array from `generateStaticParams()` outside the static-demo build —
  the exact same bug class already known and worked around for
  `output: "export"` (see the ADR), but this confirms it *also*
  affects the plain server build under real GitHub Actions conditions
  (never reproduced locally or in the from-scratch container, which
  is this bug class's documented, maddening signature). `dynamicParams
  = true` was tried first as the documented Next.js fix but rejected
  at build time under `output: "export"` (`"dynamicParams: true"
  cannot be used with "output: export"`, and Next's route-config
  parser only accepts literal AST values — a computed
  `process.env.STATIC_DEMO !== "true"` expression fails with
  `Unsupported node type "BinaryExpression"`, so the value can't even
  be conditioned per build in one file). The real fix: every wrapper's
  `generateStaticParams()` now returns a placeholder `{ id: "unused" }`
  entry instead of `[]` in the non-static-demo build too — the same
  never-return-a-literal-empty-array rule already applied to the
  static-demo build, now applied everywhere, with no `dynamicParams`
  export needed at all. Verified: both build variants succeed, the
  full local e2e suite is back to 47/48 (only the pre-existing
  `reports.spec.ts` flake), and the fix is pushed to PR #20 pending a
  final confirming CI run. The temporary diagnostic-log upload step in
  `ci.yml` and the (now-superseded, harmless-but-unnecessary) warm-up
  step should both be removed once that run confirms green.

- **Both build variants, real builds this session**: `next build`
  (default, `NEXT_PUBLIC_API_URL` pointed at a real local API) — 26
  routes, succeeds, no static-demo artifacts leak in (dynamic routes
  whose `generateStaticParams` is gated behind `STATIC_DEMO=true`
  correctly return `[]` and generate nothing extra). `next build`
  with `STATIC_DEMO=true NEXT_PUBLIC_STATIC_DEMO=true` — 46 routes,
  succeeds, `output: "export"` produces a working static `out/`
  directory. Both verified by actually running the build, not by
  reading `next.config.js` and assuming.
- **Full API suite unaffected**: `pnpm --filter @questlearn/api test`
  — **36 suites, 309 tests, all pass**, run twice this session (an
  intermediate run's 129 failures were traced to Docker Desktop's
  daemon having gone down between sessions — an environment outage,
  not a code issue — confirmed by `docker ps` failing to reach the
  daemon, restarting it, and the identical suite passing clean
  immediately after).
- **Full e2e suite, both variants**: `pnpm --filter @questlearn/web
  e2e` (Playwright, 48 tests, against the default build, real API on
  a real port) — **47/48 pass**, the one failure being
  `reports.spec.ts`'s "screenshots" test, a **pre-existing flake
  independently reproduced against fully unmodified code** (`git
  stash` applied, zero Module 10.5 changes present, same single test
  timed out at the identical spot) — not a regression from this
  module, not fixed here as it's out of scope. Run a second time after
  every fix in this module's correctness pass (design-system,
  dashboard, demo-mode changes) to confirm zero additional regressions
  — same 47/48 result both times.
- **The static-demo build's correctness was verified by actually
  driving the built export in a browser** (serving the real `out/`
  directory under its real `/questlearn` base path locally), not by
  reasoning about the source — this caught three real bugs a
  read-through of the diff would not have:
  1. Every mutating control reachable on an included page threw an
     unhandled promise rejection with zero user feedback on click
     (`NOT_WIRED`'s throw, uncaught). Fixed by extending `DEMO_MODE`
     to cover the static-demo build so `DemoModeAction` disables them
     — see ADR 0005 for the full list of controls found and fixed
     (roster remove/rename/rotate/add, activity publish/archive/
     question add-remove-reorder, question archive, concept tag
     add/remove, every quest-builder step control).
  2. Layout-level `DemoModeBanner` (a `DEMO_MODE`-gated component
     reused as a side effect of fix #1) told static-demo visitors to
     "sign in with the seeded demo teacher or learner account" — a
     login flow that does not exist in this build (there's only the
     `/demo` role-picker). Fixed with build-specific copy
     (`IS_STATIC_DEMO` branch in `DemoModeBanner.tsx`).
  3. Three included pages linked, with a real seeded id, into pages
     only statically generated for a placeholder `id: "unused"` —
     Question detail's "Edit", Activity detail's "Preview"/"Assign",
     and every submitted-assignment row on the learner dashboard —
     confirmed as real 404s by navigating to the built URLs directly.
     Two of the destinations (`/attempts/[id]/result`,
     `/classes/[id]/learners/[learnerId]/report`) turned out to be
     entirely read-only on inspection and were un-excluded instead —
     given real `generateStaticParams`, and their `mock-api.ts` stubs
     wired to real derived mock data instead of `NOT_WIRED` — since
     hiding a link to content that could legitimately be shown would
     have been a worse fix than showing it. The remaining
     mutation-only destinations (question edit, activity preview/
     assign) keep their links, but as the same disabled-with-tooltip
     control every other demo-blocked action uses, not a link to
     nowhere.
- **`Select`/`Tag` design-system change, verified not to affect any
  other consumer**: both gained an optional `disabled` prop (default
  falsy, fully backward-compatible) to make fix #1 above actually
  work — `DemoModeAction`'s clone-with-`disabled:true` approach is a
  no-op against a component that doesn't accept the prop, which the
  first attempt at this fix silently was (caught by re-inspecting the
  built export's DOM state, not by re-reading the diff). `QuestionForm`
  (the accepted-answers `Tag` picker) and the assign-activity form
  (its class-picker `Select`) are `Select`/`Tag`'s only other
  consumers; both were rebuilt and their pages re-verified working
  (`questions.spec.ts`, `assignments-attempts.spec.ts` e2e both still
  pass) after the change.
- **Mock data's numeric/textual accuracy, spot-checked against the
  built export, not just the source file**: class mastery (Solar
  System Basics 98%, matching the real seeded `0.9750000014516972`
  score's rounding), gamification (130 XP, Level 2, 30/200 into next
  level), and the three learner assignment scores (50%, 100%, 100%)
  all confirmed rendering correctly by loading the actual pages in a
  browser and reading the DOM, not by asserting the mock data file
  looks right.

## Known testing gaps

- **No production-scale load testing** — explicitly out of scope per
  §7's NFRs. Reporting's live-computed aggregates are documented as a
  scale assumption in Module 9's README section, not silently
  unbounded.
- **No automated accessibility test suite** (e.g., `axe-core` wired
  into Playwright) — this module's accessibility work was a manual
  audit + fix pass, not automated regression coverage. A reasonable
  follow-up, not required for this module's scope.
- **No dedicated SAST/DAST security scanning tool** — `pnpm audit`
  plus manual CSP/header verification stood in for a "security scan"
  step; a real SAST tool (e.g., Semgrep) in CI is reasonable future
  work.
- Windows-specific: Next.js's standalone build output
  (`apps/web/.next/standalone`) requires elevated privileges to
  produce locally on Windows (symlink creation) — gated behind a
  `DOCKER_BUILD` env flag so it only activates inside the Linux Docker
  build stage, confirmed not to affect local Windows verification
  builds.
