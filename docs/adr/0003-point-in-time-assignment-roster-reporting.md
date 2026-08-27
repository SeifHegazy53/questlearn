# ADR 0003: Point-in-Time Assignment Roster Reporting

## Status

Accepted

## Context

`ReportsService.buildAssignmentRows` computes `assignedCount` for
every assignment in a class from a single query —
`rosterEntry.count({ where: { classId, removedAt: null } })` — run
once and reused for every assignment row, regardless of how old that
assignment is. The teacher dashboard and CSV export both read
`assignedCount`/`submittedCount`/`completionRate` as "how many of my
enrolled students should have done this, and how many did," but the
implementation actually answers a different question: "how many
students are enrolled *right now*, compared against submissions to
this assignment from *any point in its history*."

Those two questions diverge as soon as roster membership changes after
an assignment is created. A learner who joins the class *after* an
older assignment already existed is counted in that assignment's
`assignedCount` even though they were never actually assigned it — and
if they never submit (they can't reasonably be expected to complete
work assigned before they existed), the reported completion rate is
silently deflated. A learner who leaves the class is dropped from
`assignedCount` for every assignment, including ones from when they
were still enrolled and legitimately submitted work — deflating
`assignedCount` while the numerator still includes their submission,
which can push `completionRate` above what a bounded rate should ever
show relative to current membership, and misstates the historical
picture either way. Neither of these is a hypothetical: this is
exactly what the code already does today for every class with any
roster churn at all, on every assignment older than the most recent
roster change.

The data needed to compute this correctly already exists.
`RosterEntry.addedAt`/`removedAt` are real timestamps, not derived or
approximate, and — critically — leaving and rejoining a class creates
a **new** `RosterEntry` row rather than mutating the old one:
`RosterEntry` has no `@@unique([classId, userId])` constraint, so a
learner who leaves and later rejoins ends up with two (or more) rows,
each with its own `addedAt`/`removedAt` window. Historical membership
at any past instant is therefore already exactly reconstructible from
data the schema has been recording since Module 2 — this defect is a
query-shape problem, not a missing-data problem.

`AttemptsService.start()` independently checks the learner's *current*
roster status (`removedAt: null`) before allowing an attempt to begin
— that check is correct and unrelated to this ADR (a class only wants
currently-enrolled learners starting new work) and is not touched
here. Its consequence, though, is that a learner who joins a class
*after* an assignment already exists can still legitimately start and
submit that assignment, since nothing in `start()` checks assignment
age against roster join time. Those submissions are real and should
count toward *something* — just not silently into the same
`assignedCount`/`submittedCount` pair as the assignment's original
cohort, which would make `completionRate` exceed 100% for reasons that
have nothing to do with lateness or effort.

## Decision

- **`assignedCount` for a given assignment is computed point-in-time**,
  as the count of distinct learners with *any* `RosterEntry` row for
  that class satisfying
  `addedAt <= assignment.createdAt AND (removedAt IS NULL OR removedAt > assignment.createdAt)`.
  A learner with multiple rows (leave→rejoin) is checked across all of
  their rows, not just their most recent one — if *any* row covers the
  assignment's creation instant, they were enrolled at that instant,
  regardless of what happened to their membership afterward.

- **No new table, no schema migration, no backfill.** The existing
  `RosterEntry.addedAt`/`removedAt` timestamps are the source of
  truth; `buildAssignmentRows` is changed to fetch all `RosterEntry`
  rows for the class (including removed ones) once, alongside all
  assignments with their attempts, and compute each assignment's
  point-in-time cohort in application code — not a new query per
  assignment (no N+1), and no new persisted representation of
  membership history.

- **`submittedCount` (name unchanged) is redefined** to count only
  submissions from learners who were in that assignment's historical
  cohort — i.e., the intersection of "submitted" and "was assigned."
  This keeps `completionRate = submittedCount / assignedCount`
  structurally bounded to ≤100% by construction, the same way it
  already reads to a teacher, without needing an explicit cap or a
  comment explaining why a rate can exceed unity.

- **A new field, `lateJoinSubmittedCount`, captures submissions from
  learners who joined after the assignment was created but submitted
  anyway.** These submissions are real, permitted (`start()` is
  unchanged and still allows them), and worth surfacing — discarding
  them silently would make real teacher-visible activity disappear
  from the report for no reason. They are kept as a separate field
  rather than folded into `submittedCount`, specifically so they
  cannot inflate `completionRate` past what the assignment's actual
  cohort achieved. Surfaced as a 5th CSV column ("Late-Join
  Submissions") and, in the UI, only as a note when nonzero — the
  common case (no roster churn between assignment creation and
  submission) renders exactly as it does today.

- **`AttemptsService.start()` and all access-control logic are
  unchanged.** This ADR is a reporting-correctness fix, not a
  gating change — a learner's ability to start and submit an
  assignment is governed entirely by their *current* roster status,
  exactly as before. Only how that submission is *categorized* in the
  report changes.

- **Explicit teacher assign/unassign of individual learners to a
  specific assignment stays out of scope.** Nothing here introduces
  the concept of an assignment having its own recipient list
  independent of class roster history; "who was assigned" remains
  entirely derived from "who was on the roster when the assignment was
  created."

### Rejected alternative: an `AssignmentRecipient` snapshot table

Considered: at assignment-creation time, write one row per
currently-enrolled learner into a new `AssignmentRecipient` table,
snapshotting the cohort explicitly.

Rejected because the fact this table would store — "who was enrolled
in this class when this assignment was created" — is **already
exactly reconstructible** from `RosterEntry.addedAt`/`removedAt`,
including through leave→rejoin, with no ambiguity and no missing data.
Introducing a second, physically separate representation of the same
fact would create a new consistency invariant with no independent
source of truth to justify it: the snapshot table and the roster
history would need to agree by construction rather than by
definition, and any future bug either in the write path (assignment
creation missing a learner) or absent backfill for pre-existing
assignments would let them silently diverge with no way to tell which
one is right. A derived, point-in-time computation from the existing
history has exactly one source of truth and cannot drift from it. If
a future requirement genuinely needs an assignment to have a
recipient list independent of roster history — e.g., explicit
per-learner assign/unassign (already declared out of scope above) —
that would be a deliberate, separate feature with its own
justification, not a byproduct of fixing this report.

## Consequences

- `buildAssignmentRows` (`apps/api/src/reports/reports.service.ts`)
  changes from one shared roster-count query reused for every
  assignment to a single fetch of all `RosterEntry` rows (including
  removed ones) and all assignments-with-attempts for the class,
  computing each assignment's point-in-time cohort and
  `lateJoinSubmittedCount` in application code — no N+1 query pattern,
  same query count shape as before per class.
- `AssignmentReportRow` gains `lateJoinSubmittedCount: number`, both
  in the dashboard JSON and as the CSV's 5th column
  ("Late-Join Submissions"), additive in both places.
- Historical reports for classes with any roster churn will show
  different (more accurate) `assignedCount`/`submittedCount`/
  `completionRate` numbers than before this change, for any assignment
  older than the class's most recent roster change — this is the
  fix, not a regression, and is exercised directly by new integration
  tests covering leave→rejoin reconstruction, late-join exclusion, and
  multiple assignments with roster churn between them.
- `apps/web/src/app/classes/[id]/report/page.tsx` shows a note only
  when `lateJoinSubmittedCount > 0` for a given assignment — the
  common case (no churn) is visually unchanged.
- No changes anywhere to `AttemptsService.start()`, roster
  join/leave/remove logic, or any access-control path.
- `Assignment.archivedAt` was observed during this investigation to be
  dead: several read paths (`reports.service.ts`, `assignments.service.ts`,
  `attempts.service.ts`) filter on `archivedAt: null`, but no code
  anywhere ever sets it — unlike every other archivable model in the
  schema (`Activity`, `Concept`, `Class`, `Question`, `Quest`), which
  all have a real archive mutation, `Assignment` has none. The column
  and its filters are currently inert. That is a separate, pre-existing
  defect unrelated to point-in-time roster reporting — logged as
  backlog, not addressed by this change.
