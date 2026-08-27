import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "../support/test-app";
import { PrismaService } from "../../src/prisma/prisma.service";
import * as argon2 from "argon2";

/**
 * Module 10.3 / ADR 0003: proves `assignedCount`/`submittedCount`/
 * `lateJoinSubmittedCount` are computed point-in-time from
 * `RosterEntry.addedAt`/`removedAt` history, not from the class's
 * current roster — driven entirely through the real HTTP surface
 * (join, leave, rejoin, assign, attempt, submit), never by
 * hand-inserting roster or assignment rows.
 */
describe("point-in-time assignment roster reporting (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const teacherEmail = `pit-roster-teacher-${Date.now()}@example.com`;
  const password = "correcthorse123";
  let teacherToken: string;
  let tenantId: string;
  let activityId: string;
  const questionIds: string[] = [];
  const classIds: string[] = [];
  const assignmentIds: string[] = [];

  function teacherAuth() {
    return { Authorization: `Bearer ${teacherToken}` };
  }

  /** One real published, single-question activity reused across every class/assignment in this file. */
  async function createActivity() {
    const q = await request(app.getHttpServer())
      .post("/questions")
      .set(teacherAuth())
      .send({ type: "true_false", prompt: "Point-in-time roster question", points: 1, correctAnswer: true })
      .expect(201);
    questionIds.push(q.body.id);

    const activity = await request(app.getHttpServer()).post("/activities").set(teacherAuth()).send({ title: "PIT Roster Activity" }).expect(201);
    await request(app.getHttpServer()).post(`/activities/${activity.body.id}/questions`).set(teacherAuth()).send({ questionId: q.body.id }).expect(201);
    await request(app.getHttpServer()).post(`/activities/${activity.body.id}/publish`).set(teacherAuth()).expect(200);
    return activity.body.id as string;
  }

  async function createClass(name: string) {
    const cls = await request(app.getHttpServer()).post("/classes").set(teacherAuth()).send({ name }).expect(201);
    classIds.push(cls.body.id);
    return { classId: cls.body.id as string, joinCode: cls.body.joinCode as string };
  }

  async function joinClass(joinCode: string, name: string) {
    const email = `pit-roster-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const joined = await request(app.getHttpServer())
      .post("/classes/join")
      .send({ joinCode, name, email, password: "learnerpassword123" })
      .expect(200);
    return { auth: { Authorization: `Bearer ${joined.body.accessToken}` as string }, userId: joined.body.user.id as string };
  }

  async function rejoinClass(joinCode: string, auth: { Authorization: string }) {
    await request(app.getHttpServer()).post("/classes/join").set(auth).send({ joinCode }).expect(200);
  }

  async function removeFromRoster(classId: string, rosterId: string) {
    await request(app.getHttpServer()).delete(`/classes/${classId}/roster/${rosterId}`).set(teacherAuth()).expect(200);
  }

  async function findRosterId(classId: string, userId: string) {
    const entry = await prisma.rosterEntry.findFirstOrThrow({ where: { classId, userId, removedAt: null } });
    return entry.id;
  }

  async function createAssignment(classId: string) {
    const assignment = await request(app.getHttpServer())
      .post("/assignments")
      .set(teacherAuth())
      .send({ classId, activityId, dueAt: new Date(Date.now() + 86400000).toISOString() })
      .expect(201);
    assignmentIds.push(assignment.body.id);
    return assignment.body.id as string;
  }

  async function submitAssignment(assignmentId: string, auth: { Authorization: string }) {
    const started = await request(app.getHttpServer()).post(`/assignments/${assignmentId}/attempts/start`).set(auth).expect(200);
    const aqId = started.body.questions[0].activityQuestionId;
    await request(app.getHttpServer()).patch(`/attempts/${started.body.id}/responses/${aqId}`).set(auth).send({ responseValue: true }).expect(200);
    return request(app.getHttpServer()).post(`/attempts/${started.body.id}/submit`).set(auth).expect(200);
  }

  async function getReportRow(classId: string, assignmentId: string) {
    const res = await request(app.getHttpServer()).get(`/classes/${classId}/report`).set(teacherAuth()).expect(200);
    return res.body.assignments.find((a: { assignmentId: string }) => a.assignmentId === assignmentId);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const tenant = await prisma.tenant.create({ data: { name: "PIT Roster Tenant" } });
    tenantId = tenant.id;
    const teacher = await prisma.user.create({
      data: { tenantId: tenant.id, email: teacherEmail, name: "Teacher", passwordHash, emailVerifiedAt: new Date() },
    });
    const login = await request(app.getHttpServer()).post("/auth/login").send({ email: teacher.email, password }).expect(200);
    teacherToken = login.body.accessToken;

    activityId = await createActivity();
  });

  afterAll(async () => {
    if (assignmentIds.length > 0) {
      await prisma.masteryEvidence.deleteMany({ where: { attemptResponse: { attempt: { assignmentId: { in: assignmentIds } } } } });
      await prisma.xpTransaction.deleteMany({ where: { attempt: { assignmentId: { in: assignmentIds } } } });
      await prisma.attemptResponse.deleteMany({ where: { attempt: { assignmentId: { in: assignmentIds } } } });
      await prisma.attempt.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
      await prisma.assignment.deleteMany({ where: { id: { in: assignmentIds } } });
    }
    await prisma.learnerBadge.deleteMany({ where: { tenantId } });
    if (activityId) {
      await prisma.activityQuestion.deleteMany({ where: { activityId } });
      await prisma.activity.deleteMany({ where: { id: activityId } });
    }
    if (questionIds.length > 0) {
      await prisma.questionVersion.deleteMany({ where: { questionId: { in: questionIds } } });
      await prisma.question.deleteMany({ where: { id: { in: questionIds } } });
    }
    if (classIds.length > 0) {
      await prisma.rosterEntry.deleteMany({ where: { classId: { in: classIds } } });
      await prisma.class.deleteMany({ where: { id: { in: classIds } } });
    }
    await prisma.user.deleteMany({ where: { tenantId } });
    if (tenantId) {
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    await app.close();
  });

  describe("leave -> rejoin: two assignments with roster churn between them each report independently correct counts", () => {
    let classId: string;
    let joinCode: string;
    let steadyAuth: { Authorization: string };
    let leaverAuth: { Authorization: string };
    let leaverUserId: string;
    let gapAssignmentId: string;
    let postRejoinAssignmentId: string;

    it("a steady learner and a leaver both join the class", async () => {
      const created = await createClass("PIT Leave-Rejoin Class");
      classId = created.classId;
      joinCode = created.joinCode;

      steadyAuth = (await joinClass(joinCode, "Steady Learner")).auth;
      const leaver = await joinClass(joinCode, "Leaver Learner");
      leaverAuth = leaver.auth;
      leaverUserId = leaver.userId;
    });

    it("the teacher removes the leaver from the roster, then an assignment created during the gap excludes them", async () => {
      const rosterId = await findRosterId(classId, leaverUserId);
      await removeFromRoster(classId, rosterId);

      gapAssignmentId = await createAssignment(classId);
      await submitAssignment(gapAssignmentId, steadyAuth);

      const row = await getReportRow(classId, gapAssignmentId);
      // Only the steady learner was enrolled when this assignment was created.
      expect(row.assignedCount).toBe(1);
      expect(row.submittedCount).toBe(1);
      expect(row.lateJoinSubmittedCount).toBe(0);
      expect(row.completionRate).toBeCloseTo(1.0);
    });

    it("the leaver rejoins (a new RosterEntry row, not a mutated one), then an assignment created after rejoin includes them", async () => {
      await rejoinClass(joinCode, leaverAuth);

      // Exactly 2 RosterEntry rows now exist for this learner: the
      // removed original and the fresh rejoin row -- proving rejoin
      // creates a new row rather than reviving the old one.
      const rows = await prisma.rosterEntry.findMany({ where: { classId, userId: leaverUserId } });
      expect(rows).toHaveLength(2);
      expect(rows.filter((r) => r.removedAt !== null)).toHaveLength(1);
      expect(rows.filter((r) => r.removedAt === null)).toHaveLength(1);

      postRejoinAssignmentId = await createAssignment(classId);
      await submitAssignment(postRejoinAssignmentId, steadyAuth);
      await submitAssignment(postRejoinAssignmentId, leaverAuth);

      const row = await getReportRow(classId, postRejoinAssignmentId);
      // Both learners were enrolled when THIS assignment was created.
      expect(row.assignedCount).toBe(2);
      expect(row.submittedCount).toBe(2);
      expect(row.lateJoinSubmittedCount).toBe(0);
      expect(row.completionRate).toBeCloseTo(1.0);
    });

    it("the earlier (gap) assignment's numbers are unaffected by the later rejoin", async () => {
      // Re-fetch: the gap assignment must still report exactly as it
      // did before the rejoin -- proving each assignment's cohort is
      // independently computed from its own createdAt, not from
      // current roster state at query time.
      const row = await getReportRow(classId, gapAssignmentId);
      expect(row.assignedCount).toBe(1);
      expect(row.submittedCount).toBe(1);
    });
  });

  describe("a late-join submission is excluded from assignedCount/submittedCount but captured separately, and completionRate stays <=100%", () => {
    let classId: string;
    let joinCode: string;
    let earlyAssignmentId: string;

    it("an assignment is created before a new learner ever joins the class", async () => {
      const created = await createClass("PIT Late-Join Class");
      classId = created.classId;
      joinCode = created.joinCode;

      const steady = await joinClass(joinCode, "Steady Learner");
      earlyAssignmentId = await createAssignment(classId);
      await submitAssignment(earlyAssignmentId, steady.auth);
    });

    it("a learner who joins after the assignment existed can still submit it, but is reported as a late-join, not part of the cohort", async () => {
      const lateJoiner = await joinClass(joinCode, "Late Joiner");
      // Permitted: AttemptsService.start() only checks CURRENT roster status.
      await submitAssignment(earlyAssignmentId, lateJoiner.auth);

      const row = await getReportRow(classId, earlyAssignmentId);
      // Only the steady learner was enrolled when the assignment was created.
      expect(row.assignedCount).toBe(1);
      // Only the steady learner's submission counts toward the cohort.
      expect(row.submittedCount).toBe(1);
      // The late joiner's real submission is captured, not discarded.
      expect(row.lateJoinSubmittedCount).toBe(1);
      // completionRate is 1/1, never inflated to 2/1 by the late-join submission.
      expect(row.completionRate).toBeCloseTo(1.0);
      expect(row.completionRate).toBeLessThanOrEqual(1.0);
    });

    it("the CSV export reflects the new Late-Join Submissions column with the real, nonzero count", async () => {
      const res = await request(app.getHttpServer()).get(`/classes/${classId}/report/csv`).set(teacherAuth()).expect(200);
      const lines: string[] = res.text.trim().split("\r\n");
      expect(lines[0]).toBe("Assignment,Due Date,Assigned,Submitted,Completion Rate,Average Score,Late-Join Submissions");

      const dataRow = lines.find((l) => l.startsWith("PIT Roster Activity"));
      expect(dataRow).toBeDefined();
      // Assigned=1, Submitted=1, Completion Rate=100.0%, and the
      // trailing Late-Join Submissions column reads 1.
      expect(dataRow).toContain("1,1,100.0%");
      expect(dataRow?.endsWith(",1")).toBe(true);
    });
  });
});
