/**
 * Module 10.5 / ADR 0005: the static demo's data, derived from the
 * actual seeded demo data (`apps/api/prisma/seed.ts`), not invented.
 * Every id, name, score, and state below was taken from a real run of
 * that seed script against a real database (Neon, re-verified live
 * during Module 10.4's provisioning) and the mastery/gamification
 * values it produces via the real grading-time code paths
 * (`MasteryService.recordEvidenceForAttempt`,
 * `GamificationService.awardForAttempt`) — nothing here is a
 * hand-picked placeholder number.
 */
import type {
  ActivityDetail,
  ActivityReport,
  ActivitySummary,
  AttemptDetail,
  ClassMasteryLearner,
  ClassReport,
  ConceptMastery,
  GamificationProfile,
  LearnerAssignment,
  QuestDetail,
  QuestListRow,
  QuestProgress,
  QuestionSummary,
  RosterEntry,
  SchoolClass,
} from "../api";

export const MOCK_TENANT_NAME = "Maple Grove Elementary (Demo)";

export const MOCK_TEACHER = {
  id: "mock-teacher-jordan-rivera",
  email: "demo.teacher@questlearn.dev",
  name: "Jordan Rivera",
  role: "teacher",
  tenantId: "mock-tenant",
};

export const MOCK_LEARNER = {
  id: "mock-learner-casey-nguyen",
  email: "demo.learner@questlearn.dev",
  name: "Casey Nguyen",
  role: "learner",
  tenantId: "mock-tenant",
};

// --- Concepts -------------------------------------------------------------

const CONCEPT_SOLAR_SYSTEM = "concept-solar-system";
const CONCEPT_NUMBER_THEORY = "concept-number-theory";
const CONCEPT_MATTER_CHEMISTRY = "concept-matter-chemistry";

export const MOCK_CONCEPTS = [
  { id: CONCEPT_SOLAR_SYSTEM, name: "Solar System Basics", description: "Planets and their place in the solar system.", createdAt: "2026-08-08T00:00:00.000Z", archivedAt: null },
  { id: CONCEPT_NUMBER_THEORY, name: "Number Theory", description: "Prime numbers and basic number classification.", createdAt: "2026-08-08T00:00:00.000Z", archivedAt: null },
  { id: CONCEPT_MATTER_CHEMISTRY, name: "States of Matter & Chemistry", description: "Chemical formulas and phase-change properties of water.", createdAt: "2026-08-08T00:00:00.000Z", archivedAt: null },
];

// --- Questions --------------------------------------------------------------

const Q_PLANET = "question-planet";
const Q_PRIME = "question-prime";
const Q_EARTH_SUN = "question-earth-sun";
const Q_WATER = "question-water";
const Q_BOILING = "question-boiling";

export const MOCK_QUESTIONS: QuestionSummary[] = [
  {
    id: Q_PLANET,
    createdAt: "2026-08-08T00:00:00.000Z",
    archivedAt: null,
    currentVersion: {
      id: "qv-planet-1", versionNumber: 1, type: "single_choice",
      prompt: "Which planet is known as the Red Planet?", points: 1,
      hint: "It's named after the Roman god of war.", explanation: null,
      options: [{ id: "a", text: "Venus" }, { id: "b", text: "Mars" }, { id: "c", text: "Jupiter" }],
      correctAnswer: "b", createdAt: "2026-08-08T00:00:00.000Z",
    },
    concepts: [{ id: "qc-1", conceptId: CONCEPT_SOLAR_SYSTEM, concept: { id: CONCEPT_SOLAR_SYSTEM, name: "Solar System Basics" } }],
  },
  {
    id: Q_PRIME,
    createdAt: "2026-08-08T00:00:01.000Z",
    archivedAt: null,
    currentVersion: {
      id: "qv-prime-1", versionNumber: 1, type: "multiple_choice",
      prompt: "Which of the following are prime numbers?", points: 2,
      hint: null, explanation: null,
      options: [{ id: "a", text: "2" }, { id: "b", text: "4" }, { id: "c", text: "7" }, { id: "d", text: "9" }],
      correctAnswer: ["a", "c"], createdAt: "2026-08-08T00:00:01.000Z",
    },
    concepts: [{ id: "qc-2", conceptId: CONCEPT_NUMBER_THEORY, concept: { id: CONCEPT_NUMBER_THEORY, name: "Number Theory" } }],
  },
  {
    id: Q_EARTH_SUN,
    createdAt: "2026-08-08T00:00:02.000Z",
    archivedAt: null,
    currentVersion: {
      id: "qv-earthsun-1", versionNumber: 1, type: "true_false",
      prompt: "The Earth revolves around the Sun.", points: 1,
      hint: null, explanation: null, options: null,
      correctAnswer: true, createdAt: "2026-08-08T00:00:02.000Z",
    },
    concepts: [{ id: "qc-3", conceptId: CONCEPT_SOLAR_SYSTEM, concept: { id: CONCEPT_SOLAR_SYSTEM, name: "Solar System Basics" } }],
  },
  {
    id: Q_WATER,
    createdAt: "2026-08-08T00:00:03.000Z",
    archivedAt: null,
    currentVersion: {
      id: "qv-water-1", versionNumber: 1, type: "short_text",
      prompt: "What is the chemical symbol for water?", points: 1,
      hint: null, explanation: "Water is composed of two hydrogen atoms and one oxygen atom.", options: null,
      correctAnswer: ["H2O", "h2o"], createdAt: "2026-08-08T00:00:03.000Z",
    },
    concepts: [{ id: "qc-4", conceptId: CONCEPT_MATTER_CHEMISTRY, concept: { id: CONCEPT_MATTER_CHEMISTRY, name: "States of Matter & Chemistry" } }],
  },
  {
    id: Q_BOILING,
    createdAt: "2026-08-08T00:00:04.000Z",
    archivedAt: null,
    currentVersion: {
      id: "qv-boiling-1", versionNumber: 1, type: "numeric",
      prompt: "What is the boiling point of water at sea level, in Celsius?", points: 1,
      hint: null, explanation: null, options: null,
      correctAnswer: { value: 100, tolerance: 1 }, createdAt: "2026-08-08T00:00:04.000Z",
    },
    concepts: [{ id: "qc-5", conceptId: CONCEPT_MATTER_CHEMISTRY, concept: { id: CONCEPT_MATTER_CHEMISTRY, name: "States of Matter & Chemistry" } }],
  },
];

// --- Activities -------------------------------------------------------------

const ACTIVITY_DRAFT = "activity-draft-review";
const ACTIVITY_FUNDAMENTALS = "activity-fundamentals";
const ACTIVITY_SOLAR_CHECK = "activity-solar-check";

function questionContent(q: QuestionSummary, order: number, pinned: boolean) {
  const v = q.currentVersion;
  return {
    activityQuestionId: `aq-${q.id}`, questionId: q.id, order, pinned,
    type: v.type, prompt: v.prompt, points: v.points, hint: v.hint, explanation: v.explanation,
    options: v.options, correctAnswer: v.correctAnswer,
  };
}

export const MOCK_ACTIVITIES: ActivitySummary[] = [
  { id: ACTIVITY_DRAFT, title: "Draft: Solar System & Numbers Review", status: "draft", publishedAt: null, createdAt: "2026-08-08T00:01:00.000Z", archivedAt: null, questionCount: 3 },
  { id: ACTIVITY_FUNDAMENTALS, title: "Published: Science & Math Fundamentals", status: "published", publishedAt: "2026-08-08T00:01:01.000Z", createdAt: "2026-08-08T00:01:01.000Z", archivedAt: null, questionCount: 5 },
  { id: ACTIVITY_SOLAR_CHECK, title: "Published: Solar System Mastery Check", status: "published", publishedAt: "2026-08-08T00:01:02.000Z", createdAt: "2026-08-08T00:01:02.000Z", archivedAt: null, questionCount: 2 },
];

export const MOCK_ACTIVITY_DETAILS: Record<string, ActivityDetail> = {
  [ACTIVITY_DRAFT]: {
    id: ACTIVITY_DRAFT, title: "Draft: Solar System & Numbers Review", status: "draft",
    publishedAt: null, createdAt: "2026-08-08T00:01:00.000Z", archivedAt: null,
    questions: [questionContent(MOCK_QUESTIONS[0], 0, false), questionContent(MOCK_QUESTIONS[1], 1, false), questionContent(MOCK_QUESTIONS[2], 2, false)],
  },
  [ACTIVITY_FUNDAMENTALS]: {
    id: ACTIVITY_FUNDAMENTALS, title: "Published: Science & Math Fundamentals", status: "published",
    publishedAt: "2026-08-08T00:01:01.000Z", createdAt: "2026-08-08T00:01:01.000Z", archivedAt: null,
    questions: MOCK_QUESTIONS.map((q, i) => questionContent(q, i, true)),
  },
  [ACTIVITY_SOLAR_CHECK]: {
    id: ACTIVITY_SOLAR_CHECK, title: "Published: Solar System Mastery Check", status: "published",
    publishedAt: "2026-08-08T00:01:02.000Z", createdAt: "2026-08-08T00:01:02.000Z", archivedAt: null,
    questions: [questionContent(MOCK_QUESTIONS[0], 0, true), questionContent(MOCK_QUESTIONS[2], 1, true)],
  },
};

// Real question-analysis numbers for the fundamentals activity's real
// grading run (planet correct, prime partial-credit wrong, earthSun
// correct+hint, water/boiling both scored 0 -- see the README note on
// the shape mismatch in seed.ts's correctResponseFor for short_text/
// numeric types, a real latent bug this static snapshot faithfully
// reflects rather than smooths over).
export const MOCK_ACTIVITY_REPORTS: Record<string, ActivityReport> = {
  [ACTIVITY_FUNDAMENTALS]: {
    activityId: ACTIVITY_FUNDAMENTALS, title: "Published: Science & Math Fundamentals", status: "published",
    questions: [
      { activityQuestionId: `aq-${Q_PLANET}`, order: 0, prompt: MOCK_QUESTIONS[0].currentVersion.prompt, type: "single_choice", points: 1, submittedResponseCount: 1, correctCount: 1, correctRate: 1, averagePointsAwarded: 1, hintViewedCount: 0, hintViewRate: 0 },
      { activityQuestionId: `aq-${Q_PRIME}`, order: 1, prompt: MOCK_QUESTIONS[1].currentVersion.prompt, type: "multiple_choice", points: 2, submittedResponseCount: 1, correctCount: 0, correctRate: 0, averagePointsAwarded: 1, hintViewedCount: 0, hintViewRate: 0 },
      { activityQuestionId: `aq-${Q_EARTH_SUN}`, order: 2, prompt: MOCK_QUESTIONS[2].currentVersion.prompt, type: "true_false", points: 1, submittedResponseCount: 1, correctCount: 1, correctRate: 1, averagePointsAwarded: 1, hintViewedCount: 1, hintViewRate: 1 },
      { activityQuestionId: `aq-${Q_WATER}`, order: 3, prompt: MOCK_QUESTIONS[3].currentVersion.prompt, type: "short_text", points: 1, submittedResponseCount: 1, correctCount: 0, correctRate: 0, averagePointsAwarded: 0, hintViewedCount: 0, hintViewRate: 0 },
      { activityQuestionId: `aq-${Q_BOILING}`, order: 4, prompt: MOCK_QUESTIONS[4].currentVersion.prompt, type: "numeric", points: 1, submittedResponseCount: 1, correctCount: 0, correctRate: 0, averagePointsAwarded: 0, hintViewedCount: 0, hintViewRate: 0 },
    ],
  },
};

// --- Classes / roster ---------------------------------------------------

const CLASS_EARTH_SCIENCE = "class-earth-science";
const CLASS_CODING_CLUB = "class-coding-club";

const rosterEarthScience: RosterEntry[] = [
  { id: "roster-avery", name: "Avery Kim", email: "avery.kim@example.com", addedAt: "2026-08-08T00:00:00.000Z", removedAt: null },
  { id: "roster-jordanp", name: "Jordan Patel", email: "jordan.patel@example.com", addedAt: "2026-08-08T00:00:00.000Z", removedAt: null },
  { id: "roster-sam", name: "Sam Rivera", email: null, addedAt: "2026-08-08T00:00:00.000Z", removedAt: null },
  { id: "roster-casey", name: "Casey Nguyen", email: "demo.learner@questlearn.dev", addedAt: "2026-08-08T00:01:03.000Z", removedAt: null },
];
const rosterCodingClub: RosterEntry[] = [
  { id: "roster-riley", name: "Riley Chen", email: "riley.chen@example.com", addedAt: "2026-08-08T00:00:00.000Z", removedAt: null },
  { id: "roster-morgan", name: "Morgan Diaz", email: null, addedAt: "2026-08-08T00:00:00.000Z", removedAt: null },
];

export const MOCK_CLASSES: SchoolClass[] = [
  { id: CLASS_EARTH_SCIENCE, name: "Period 3 — Earth Science", joinCode: "EARTHSCI", joinCodeExpiresAt: "2026-09-08T00:00:00.000Z", createdAt: "2026-08-08T00:00:00.000Z", archivedAt: null, roster: rosterEarthScience },
  { id: CLASS_CODING_CLUB, name: "After-School Coding Club", joinCode: "CODECLUB", joinCodeExpiresAt: "2026-09-08T00:00:00.000Z", createdAt: "2026-08-08T00:00:00.000Z", archivedAt: null, roster: rosterCodingClub },
];

// --- Mastery (real, live-verified numbers) ------------------------------

// Verified live against the real seeded database during Module 10.4's
// Neon provisioning: GET-equivalent MasteryService.getMasteryForLearner
// output for the demo learner, unmodified.
export const MOCK_LEARNER_MASTERY: ConceptMastery[] = [
  { conceptId: CONCEPT_SOLAR_SYSTEM, conceptName: "Solar System Basics", score: 0.9750000014516972, state: "mastered", evidenceCount: 6, distinctAttemptCount: 3 },
  { conceptId: CONCEPT_NUMBER_THEORY, conceptName: "Number Theory", score: 0.5, state: "beginning", evidenceCount: 1, distinctAttemptCount: 1 },
  { conceptId: CONCEPT_MATTER_CHEMISTRY, conceptName: "States of Matter & Chemistry", score: 0, state: "beginning", evidenceCount: 2, distinctAttemptCount: 1 },
];

export const MOCK_CLASS_MASTERY_LEARNERS: ClassMasteryLearner[] = [
  { learnerId: MOCK_LEARNER.id, learnerName: MOCK_LEARNER.name, concepts: MOCK_LEARNER_MASTERY },
];

// --- Gamification (real totals: 50+40+40 XP, level 2, 3 real badges) ---

export const MOCK_GAMIFICATION_PROFILE: GamificationProfile = {
  totalXp: 130,
  level: 2,
  xpIntoLevel: 30,
  xpForNextLevel: 200,
  badges: [
    { badgeType: "quest_starter", awardedAt: "2026-08-27T21:38:50.039Z" },
    { badgeType: "perfect_score", awardedAt: "2026-08-27T21:38:50.143Z" },
    { badgeType: "concept_champion", awardedAt: "2026-08-27T21:38:50.206Z" },
  ],
};

// --- Quests ---------------------------------------------------------------

const QUEST_EXPLORER = "quest-science-math-explorer";

export const MOCK_QUEST_DETAIL: QuestDetail = {
  id: QUEST_EXPLORER, title: "Science & Math Explorer",
  description: "Complete the fundamentals quiz, then sharpen your number theory skills.",
  createdAt: "2026-08-08T00:01:04.000Z", archivedAt: null,
  steps: [
    { id: "step-1", order: 1, activityId: ACTIVITY_FUNDAMENTALS, activityTitle: "Published: Science & Math Fundamentals", requiredConceptId: null, conceptName: null, requiredMasteryState: null },
    { id: "step-2", order: 2, activityId: null, activityTitle: null, requiredConceptId: CONCEPT_NUMBER_THEORY, conceptName: "Number Theory", requiredMasteryState: "proficient" },
  ],
};

export const MOCK_QUEST_LIST_ROW: QuestListRow = {
  id: QUEST_EXPLORER, title: "Science & Math Explorer",
  description: "Complete the fundamentals quiz, then sharpen your number theory skills.",
  totalSteps: 2, unlockedStepCount: 2, complete: false, xpAwarded: null,
};

// Step 1 (activity completion) is genuinely complete -- the learner's
// one real submitted attempt on this exact activity. Step 2 is
// unlocked but not met: Number Theory sits at "beginning" (score 0.5,
// 1 evidence row), short of the "proficient" this step requires --
// the real Module 10.2 evidence gate at work, not a hand-set demo flag.
export const MOCK_QUEST_PROGRESS: QuestProgress = {
  id: QUEST_EXPLORER, title: "Science & Math Explorer",
  description: "Complete the fundamentals quiz, then sharpen your number theory skills.",
  complete: false, xpAwarded: null,
  steps: [
    { id: "step-1", order: 1, activityId: ACTIVITY_FUNDAMENTALS, activityTitle: "Published: Science & Math Fundamentals", requiredConceptId: null, conceptName: null, requiredMasteryState: null, complete: true, unlocked: true },
    { id: "step-2", order: 2, activityId: null, activityTitle: null, requiredConceptId: CONCEPT_NUMBER_THEORY, conceptName: "Number Theory", requiredMasteryState: "proficient", complete: false, unlocked: true },
  ],
};

// --- Class report (real per-assignment numbers) -------------------------

export const MOCK_CLASS_REPORT: ClassReport = {
  classId: CLASS_EARTH_SCIENCE, className: "Period 3 — Earth Science",
  summary: { overallCompletionRate: 1, overallAverageScore: 0.8333333333333334 },
  assignments: [
    { assignmentId: "assignment-fundamentals", title: "Published: Science & Math Fundamentals", dueAt: "2026-09-03T21:38:49.910Z", assignedCount: 1, submittedCount: 1, lateJoinSubmittedCount: 0, completionRate: 1, averageScore: 0.5 },
    { assignmentId: "assignment-solar-1", title: "Published: Solar System Mastery Check", dueAt: "2026-09-03T21:38:50.071Z", assignedCount: 1, submittedCount: 1, lateJoinSubmittedCount: 0, completionRate: 1, averageScore: 1 },
    { assignmentId: "assignment-solar-2", title: "Published: Solar System Mastery Check", dueAt: "2026-09-04T21:38:50.151Z", assignedCount: 1, submittedCount: 1, lateJoinSubmittedCount: 0, completionRate: 1, averageScore: 1 },
  ],
  masterySummary: [
    { conceptId: CONCEPT_SOLAR_SYSTEM, conceptName: "Solar System Basics", beginning: 0, developing: 0, proficient: 0, mastered: 1 },
    { conceptId: CONCEPT_NUMBER_THEORY, conceptName: "Number Theory", beginning: 1, developing: 0, proficient: 0, mastered: 0 },
    { conceptId: CONCEPT_MATTER_CHEMISTRY, conceptName: "States of Matter & Chemistry", beginning: 1, developing: 0, proficient: 0, mastered: 0 },
  ],
  learners: [
    { rosterEntryId: "roster-avery", name: "Avery Kim", learnerId: null },
    { rosterEntryId: "roster-jordanp", name: "Jordan Patel", learnerId: null },
    { rosterEntryId: "roster-sam", name: "Sam Rivera", learnerId: null },
    { rosterEntryId: "roster-casey", name: "Casey Nguyen", learnerId: MOCK_LEARNER.id },
  ],
};

// --- Learner's own assignment list (dashboard) -- the same 3 real
// submitted attempts the class report and mastery data above derive
// from, in the shape GET /assignments/mine returns.
export const MOCK_LEARNER_ASSIGNMENTS: LearnerAssignment[] = [
  {
    id: "assignment-fundamentals", dueAt: "2026-09-03T21:38:49.910Z", createdAt: "2026-08-27T21:38:49.000Z",
    classId: CLASS_EARTH_SCIENCE, activityId: ACTIVITY_FUNDAMENTALS,
    class: { id: CLASS_EARTH_SCIENCE, name: "Period 3 — Earth Science" },
    activity: { id: ACTIVITY_FUNDAMENTALS, title: "Published: Science & Math Fundamentals", status: "published" },
    attempt: { id: "attempt-fundamentals", status: "submitted", score: 0.5 },
  },
  {
    id: "assignment-solar-1", dueAt: "2026-09-03T21:38:50.071Z", createdAt: "2026-08-27T21:38:50.000Z",
    classId: CLASS_EARTH_SCIENCE, activityId: ACTIVITY_SOLAR_CHECK,
    class: { id: CLASS_EARTH_SCIENCE, name: "Period 3 — Earth Science" },
    activity: { id: ACTIVITY_SOLAR_CHECK, title: "Published: Solar System Mastery Check", status: "published" },
    attempt: { id: "attempt-solar-1", status: "submitted", score: 1 },
  },
  {
    id: "assignment-solar-2", dueAt: "2026-09-04T21:38:50.151Z", createdAt: "2026-08-27T21:38:50.100Z",
    classId: CLASS_EARTH_SCIENCE, activityId: ACTIVITY_SOLAR_CHECK,
    class: { id: CLASS_EARTH_SCIENCE, name: "Period 3 — Earth Science" },
    activity: { id: ACTIVITY_SOLAR_CHECK, title: "Published: Solar System Mastery Check", status: "published" },
    attempt: { id: "attempt-solar-2", status: "submitted", score: 1 },
  },
];

// --- Attempt results (found missing, added during ADR 0005's
// static-demo correctness verification: the learner dashboard links
// every submitted assignment row straight to its
// `/attempts/{id}/result` page, which is entirely read-only -- no
// mutation, no autosave, no submit -- so unlike `attempt` (the actual
// answering flow, a real mutation surface, correctly excluded), there
// is no reason to exclude this one from the static demo too. Per-
// question correctness/points below are derived from the same real
// graded run as `MOCK_ACTIVITY_REPORTS.activity-fundamentals` and the
// scores already in `MOCK_LEARNER_ASSIGNMENTS` (0.5, 1, 1) -- the
// per-question pointsAwarded for each attempt sum to exactly that
// attempt's score * total points, not invented independently.
export const MOCK_ATTEMPT_DETAILS: Record<string, AttemptDetail> = {
  "attempt-fundamentals": {
    id: "attempt-fundamentals", assignmentId: "assignment-fundamentals", status: "submitted",
    startedAt: "2026-08-27T21:40:00.000Z", submittedAt: "2026-08-27T21:44:00.000Z", score: 0.5,
    questions: [
      { activityQuestionId: `aq-${Q_PLANET}`, questionId: Q_PLANET, order: 0, type: "single_choice", prompt: "Which planet is known as the Red Planet?", points: 1, hint: "It's named after the Roman god of war.", explanation: null, options: [{ id: "a", text: "Venus" }, { id: "b", text: "Mars" }, { id: "c", text: "Jupiter" }], responseValue: "b", hintViewed: false, correctAnswer: "b", isCorrect: true, pointsAwarded: 1 },
      { activityQuestionId: `aq-${Q_PRIME}`, questionId: Q_PRIME, order: 1, type: "multiple_choice", prompt: "Which of the following are prime numbers?", points: 2, hint: null, explanation: null, options: [{ id: "a", text: "2" }, { id: "b", text: "4" }, { id: "c", text: "7" }, { id: "d", text: "9" }], responseValue: ["a"], hintViewed: false, correctAnswer: ["a", "c"], isCorrect: false, pointsAwarded: 1 },
      { activityQuestionId: `aq-${Q_EARTH_SUN}`, questionId: Q_EARTH_SUN, order: 2, type: "true_false", prompt: "The Earth revolves around the Sun.", points: 1, hint: null, explanation: null, options: null, responseValue: true, hintViewed: true, correctAnswer: true, isCorrect: true, pointsAwarded: 1 },
      { activityQuestionId: `aq-${Q_WATER}`, questionId: Q_WATER, order: 3, type: "short_text", prompt: "What is the chemical symbol for water?", points: 1, hint: null, explanation: "Water is composed of two hydrogen atoms and one oxygen atom.", options: null, responseValue: "H2O", hintViewed: false, correctAnswer: ["H2O", "h2o"], isCorrect: false, pointsAwarded: 0 },
      { activityQuestionId: `aq-${Q_BOILING}`, questionId: Q_BOILING, order: 4, type: "numeric", prompt: "What is the boiling point of water at sea level, in Celsius?", points: 1, hint: null, explanation: null, options: null, responseValue: 100, hintViewed: false, correctAnswer: { value: 100, tolerance: 1 }, isCorrect: false, pointsAwarded: 0 },
    ],
  },
  "attempt-solar-1": {
    id: "attempt-solar-1", assignmentId: "assignment-solar-1", status: "submitted",
    startedAt: "2026-08-27T21:50:00.000Z", submittedAt: "2026-08-27T21:52:00.000Z", score: 1,
    questions: [
      { activityQuestionId: `aq-${Q_PLANET}`, questionId: Q_PLANET, order: 0, type: "single_choice", prompt: "Which planet is known as the Red Planet?", points: 1, hint: "It's named after the Roman god of war.", explanation: null, options: [{ id: "a", text: "Venus" }, { id: "b", text: "Mars" }, { id: "c", text: "Jupiter" }], responseValue: "b", hintViewed: false, correctAnswer: "b", isCorrect: true, pointsAwarded: 1 },
      { activityQuestionId: `aq-${Q_EARTH_SUN}`, questionId: Q_EARTH_SUN, order: 1, type: "true_false", prompt: "The Earth revolves around the Sun.", points: 1, hint: null, explanation: null, options: null, responseValue: true, hintViewed: false, correctAnswer: true, isCorrect: true, pointsAwarded: 1 },
    ],
  },
  "attempt-solar-2": {
    id: "attempt-solar-2", assignmentId: "assignment-solar-2", status: "submitted",
    startedAt: "2026-08-28T21:50:00.000Z", submittedAt: "2026-08-28T21:52:00.000Z", score: 1,
    questions: [
      { activityQuestionId: `aq-${Q_PLANET}`, questionId: Q_PLANET, order: 0, type: "single_choice", prompt: "Which planet is known as the Red Planet?", points: 1, hint: "It's named after the Roman god of war.", explanation: null, options: [{ id: "a", text: "Venus" }, { id: "b", text: "Mars" }, { id: "c", text: "Jupiter" }], responseValue: "b", hintViewed: false, correctAnswer: "b", isCorrect: true, pointsAwarded: 1 },
      { activityQuestionId: `aq-${Q_EARTH_SUN}`, questionId: Q_EARTH_SUN, order: 1, type: "true_false", prompt: "The Earth revolves around the Sun.", points: 1, hint: null, explanation: null, options: null, responseValue: true, hintViewed: false, correctAnswer: true, isCorrect: true, pointsAwarded: 1 },
    ],
  },
};

export const MOCK_ATTEMPT_IDS = { fundamentals: "attempt-fundamentals", solar1: "attempt-solar-1", solar2: "attempt-solar-2" };

// --- Learner report (a teacher's per-student view) -- found missing
// alongside the attempt-result gap during ADR 0005's correctness
// pass: /classes/[id]/learners/[learnerId]/report is entirely
// read-only (composed from the same mastery/gamification/quest data
// already shown elsewhere), so it belongs in the static demo's
// navigation the same way attempt-result does, rather than being
// excluded as if it were a mutation. Every field below is one of this
// file's own already-real values, just recomposed into
// `LearnerReport`'s shape -- nothing new was invented for it.
export const MOCK_LEARNER_REPORT = {
  learner: { id: MOCK_LEARNER.id, name: MOCK_LEARNER.name, email: MOCK_LEARNER.email },
  attempts: [
    { assignmentId: "assignment-fundamentals", activityTitle: "Published: Science & Math Fundamentals", className: "Period 3 — Earth Science", dueAt: "2026-09-03T21:38:49.910Z", status: "submitted" as const, score: 0.5, submittedAt: "2026-08-27T21:44:00.000Z" },
    { assignmentId: "assignment-solar-1", activityTitle: "Published: Solar System Mastery Check", className: "Period 3 — Earth Science", dueAt: "2026-09-03T21:38:50.071Z", status: "submitted" as const, score: 1, submittedAt: "2026-08-27T21:52:00.000Z" },
    { assignmentId: "assignment-solar-2", activityTitle: "Published: Solar System Mastery Check", className: "Period 3 — Earth Science", dueAt: "2026-09-04T21:38:50.151Z", status: "submitted" as const, score: 1, submittedAt: "2026-08-28T21:52:00.000Z" },
  ],
  mastery: MOCK_LEARNER_MASTERY,
  gamification: MOCK_GAMIFICATION_PROFILE,
  quests: [MOCK_QUEST_LIST_ROW],
};

export const MOCK_CLASS_IDS = { earthScience: CLASS_EARTH_SCIENCE, codingClub: CLASS_CODING_CLUB };
export const MOCK_ACTIVITY_IDS = { draft: ACTIVITY_DRAFT, fundamentals: ACTIVITY_FUNDAMENTALS, solarCheck: ACTIVITY_SOLAR_CHECK };
export const MOCK_QUESTION_IDS = { planet: Q_PLANET, prime: Q_PRIME, earthSun: Q_EARTH_SUN, water: Q_WATER, boiling: Q_BOILING };
export const MOCK_QUEST_ID = QUEST_EXPLORER;
