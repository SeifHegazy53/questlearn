/**
 * Module 10.5 / ADR 0005: drop-in replacement for `lib/api.ts`, used
 * only in the static-demo build (see next.config.js's webpack alias,
 * gated behind `STATIC_DEMO=true`). `lib/api.ts` itself is completely
 * untouched by this file's existence -- every other build variant
 * (local dev, CI, Module 10.4's Docker image) still resolves
 * `@/lib/api` to the real file.
 *
 * Every function here returns synchronously-resolved mock data (no
 * network, no delay) covering exactly the read-only pages the static
 * demo includes. It does not implement the full `lib/api.ts` surface
 * -- mutating functions (createClass, addRosterEntry, publishActivity,
 * etc.) are deliberately absent, since no page in the static demo's
 * navigation calls them (see ADR 0005: no mutation handling needed,
 * there's no backend to send a mutation to).
 */
import {
  MOCK_ACTIVITIES,
  MOCK_ACTIVITY_DETAILS,
  MOCK_ACTIVITY_REPORTS,
  MOCK_ATTEMPT_DETAILS,
  MOCK_CLASSES,
  MOCK_CLASS_IDS,
  MOCK_CLASS_MASTERY_LEARNERS,
  MOCK_CLASS_REPORT,
  MOCK_CONCEPTS,
  MOCK_GAMIFICATION_PROFILE,
  MOCK_LEARNER,
  MOCK_LEARNER_ASSIGNMENTS,
  MOCK_LEARNER_MASTERY,
  MOCK_LEARNER_REPORT,
  MOCK_QUESTIONS,
  MOCK_QUEST_DETAIL,
  MOCK_QUEST_LIST_ROW,
  MOCK_QUEST_PROGRESS,
} from "./mock-data";
import type {
  ActivityDetail,
  ActivityReport,
  ActivitySummary,
  AttemptDetail,
  ClassMasteryLearner,
  ClassReport,
  Concept,
  ConceptMastery,
  GamificationProfile,
  LearnerAssignment,
  LearnerReport,
  QuestDetail,
  QuestListRow,
  QuestProgress,
  QuestSummary,
  QuestionSummary,
  SchoolClass,
} from "../api";

// Every type export from the real module is re-exported unchanged
// (type-only, so it can't collide with this file's own same-named
// function exports below) -- any reused page importing a type keeps
// working via the same `@/lib/api` specifier regardless of which
// build variant it resolves to. `ApiError` and `masteryGateStatus`
// are real VALUES this file intentionally reuses as-is rather than
// reimplementing (ApiError is just an Error subclass; masteryGateStatus
// is pure display-formatting logic with no network dependency).
export type * from "../api";
export { ApiError, masteryGateStatus } from "../api";

/**
 * @deprecated no backend in the static demo -- kept as a stand-in so
 * any excluded page's source still type-checks against the mock
 * module unchanged. `...args: unknown[]` accepts any call signature
 * the real function it's standing in for might have; it's never
 * actually invoked by any page in the demo's navigation.
 */
const NOT_WIRED = async (..._args: unknown[]): Promise<any> => {
  throw new Error("This action isn't available in the static demo. Clone the repo to try the full app.");
};

// --- Classes ----------------------------------------------------------------

export async function listClasses(_accessToken: string): Promise<SchoolClass[]> {
  return MOCK_CLASSES;
}

export async function getClass(_accessToken: string, id: string): Promise<SchoolClass> {
  const found = MOCK_CLASSES.find((c) => c.id === id);
  if (!found) throw new (await import("../api")).ApiError("Class not found.", 404);
  return found;
}

export const createClass = NOT_WIRED;
export const updateClass = NOT_WIRED;
export const rotateJoinCode = NOT_WIRED;
export const addRosterEntry = NOT_WIRED;
export const removeRosterEntry = NOT_WIRED;

// --- Concepts ---------------------------------------------------------------

export async function listConcepts(_accessToken: string): Promise<Concept[]> {
  return MOCK_CONCEPTS;
}
export const createConcept = NOT_WIRED;
export const archiveConcept = NOT_WIRED;
export const updateQuestionConcepts = NOT_WIRED;

// --- Questions ----------------------------------------------------------------

export async function listQuestions(_accessToken: string): Promise<QuestionSummary[]> {
  return MOCK_QUESTIONS;
}

export async function getQuestion(_accessToken: string, id: string): Promise<QuestionSummary> {
  const found = MOCK_QUESTIONS.find((q) => q.id === id);
  if (!found) throw new (await import("../api")).ApiError("Question not found.", 404);
  return found;
}

export const createQuestion = NOT_WIRED;
export const updateQuestion = NOT_WIRED;
export const archiveQuestion = NOT_WIRED;

// --- Activities ---------------------------------------------------------------

export async function listActivities(_accessToken: string): Promise<ActivitySummary[]> {
  return MOCK_ACTIVITIES;
}

export async function getActivity(_accessToken: string, id: string): Promise<ActivityDetail> {
  const found = MOCK_ACTIVITY_DETAILS[id];
  if (!found) throw new (await import("../api")).ApiError("Activity not found.", 404);
  return found;
}

export async function getActivityReport(_accessToken: string, activityId: string): Promise<ActivityReport> {
  const found = MOCK_ACTIVITY_REPORTS[activityId];
  if (!found) throw new (await import("../api")).ApiError("No report available for this activity in the static demo.", 404);
  return found;
}

export const createActivity = NOT_WIRED;
export const renameActivity = NOT_WIRED;
export const addActivityQuestion = NOT_WIRED;
export const removeActivityQuestion = NOT_WIRED;
export const reorderActivityQuestions = NOT_WIRED;
export const publishActivity = NOT_WIRED;
export const archiveActivity = NOT_WIRED;
export const joinClass = NOT_WIRED;

// --- Assignments / attempts ---------------------------------------------

export async function listMyAssignments(_accessToken: string): Promise<LearnerAssignment[]> {
  return MOCK_LEARNER_ASSIGNMENTS;
}

export const listAssignments = async (..._args: unknown[]) => [];
export const getAssignment = NOT_WIRED;
export const createAssignment = NOT_WIRED;
export const updateAssignment = NOT_WIRED;
export const startAttempt = NOT_WIRED;

// getAttempt IS wired, unlike its neighbors: /attempts/[id]/result is
// entirely read-only (no autosave, no submit, no answer editing), so
// it's included in the static demo's navigation as of ADR 0005's
// correctness pass -- see MOCK_ATTEMPT_DETAILS's comment.
export async function getAttempt(_accessToken: string, id: string): Promise<AttemptDetail> {
  const found = MOCK_ATTEMPT_DETAILS[id];
  if (!found) throw new (await import("../api")).ApiError("Attempt not found.", 404);
  return found;
}

export const autosaveResponse = NOT_WIRED;
export const markHintViewed = NOT_WIRED;
export const submitAttempt = NOT_WIRED;

// --- Mastery ------------------------------------------------------------

export async function getMyMastery(_accessToken: string): Promise<ConceptMastery[]> {
  return MOCK_LEARNER_MASTERY;
}

export async function getClassMastery(_accessToken: string, _classId: string): Promise<{ learners: ClassMasteryLearner[] }> {
  return { learners: MOCK_CLASS_MASTERY_LEARNERS };
}

// --- Gamification ---------------------------------------------------------

export async function getGamificationProfile(_accessToken: string): Promise<GamificationProfile> {
  return MOCK_GAMIFICATION_PROFILE;
}

// --- Quests -----------------------------------------------------------------

export async function listQuests(_accessToken: string): Promise<QuestSummary[]> {
  return [{ id: MOCK_QUEST_DETAIL.id, title: MOCK_QUEST_DETAIL.title, description: MOCK_QUEST_DETAIL.description, createdAt: MOCK_QUEST_DETAIL.createdAt, archivedAt: null, stepCount: MOCK_QUEST_DETAIL.steps.length }];
}

export async function getMyQuests(_accessToken: string): Promise<QuestListRow[]> {
  return [MOCK_QUEST_LIST_ROW];
}

export async function getQuest(_accessToken: string, id: string): Promise<QuestDetail> {
  if (id !== MOCK_QUEST_DETAIL.id) throw new (await import("../api")).ApiError("Quest not found.", 404);
  return MOCK_QUEST_DETAIL;
}

export async function getQuestProgress(_accessToken: string, id: string): Promise<QuestProgress> {
  if (id !== MOCK_QUEST_PROGRESS.id) throw new (await import("../api")).ApiError("Quest not found.", 404);
  return MOCK_QUEST_PROGRESS;
}

export const createQuest = NOT_WIRED;
export const updateQuest = NOT_WIRED;
export const archiveQuest = NOT_WIRED;
export const addQuestStep = NOT_WIRED;
export const updateQuestStep = NOT_WIRED;
export const removeQuestStep = NOT_WIRED;
export const reorderQuestSteps = NOT_WIRED;

// --- Reporting ----------------------------------------------------------

export async function getClassReport(_accessToken: string, _classId: string): Promise<ClassReport> {
  return MOCK_CLASS_REPORT;
}

export async function getClassReportCsv(_accessToken: string, _classId: string): Promise<string> {
  const header = "Assignment,Due Date,Assigned,Submitted,Completion Rate,Average Score,Late-Join Submissions";
  const rows = MOCK_CLASS_REPORT.assignments.map(
    (a) =>
      `${a.title},${a.dueAt.slice(0, 10)},${a.assignedCount},${a.submittedCount},${((a.completionRate ?? 0) * 100).toFixed(1)}%,${((a.averageScore ?? 0) * 100).toFixed(1)}%,${a.lateJoinSubmittedCount}`,
  );
  return [header, ...rows].join("\r\n") + "\r\n";
}

// getLearnerReport IS wired, unlike NOT_WIRED's default: this page is
// entirely read-only (no mutation anywhere in it), so it's included
// in the static demo -- see MOCK_LEARNER_REPORT's comment.
export async function getLearnerReport(_accessToken: string, classId: string, learnerId: string): Promise<LearnerReport> {
  if (classId !== MOCK_CLASS_IDS.earthScience || learnerId !== MOCK_LEARNER.id) {
    throw new (await import("../api")).ApiError("Learner not found.", 404);
  }
  return MOCK_LEARNER_REPORT;
}

// --- Auth (not used by any static-demo page directly -- pages call
// these through auth-context.tsx, which has its own mock; kept here
// only so a stray import doesn't crash the build) -----------------

export const register = NOT_WIRED;
export const login = NOT_WIRED;
export const verifyEmail = NOT_WIRED;
export const forgotPassword = NOT_WIRED;
export const resetPassword = NOT_WIRED;
export const refresh = NOT_WIRED;
export const logout = async () => ({ message: "ok" });
