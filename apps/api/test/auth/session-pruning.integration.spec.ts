import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "../support/test-app";
import { PrismaService } from "../../src/prisma/prisma.service";
import { EmailService } from "../../src/auth/email/email.service";
import * as argon2 from "argon2";

/**
 * Module 10.4 / ADR 0004: proves issueSession's self-pruning --
 * unconditional (not DEMO_MODE-gated), driven through the real
 * register/verify/login HTTP flow, with the revoked/expired rows it's
 * meant to prune hand-inserted via Prisma (since the API itself can't
 * produce an already-expired session on demand).
 */
describe("session self-pruning (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `session-pruning-${Date.now()}@example.com`;
  const password = "correcthorse123";
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const emailService = app.get(EmailService);
    const verifySpy = jest.spyOn(emailService, "sendVerificationEmail");

    await request(app.getHttpServer()).post("/auth/register").send({ email, password, name: "Pruning Tester" }).expect(201);
    const token = verifySpy.mock.calls[0][0].token;
    await request(app.getHttpServer()).post("/auth/verify-email").send({ token }).expect(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("a login issues one session row for a brand-new user", async () => {
    await request(app.getHttpServer()).post("/auth/login").send({ email, password }).expect(200);
    const count = await prisma.session.count({ where: { userId } });
    expect(count).toBe(1);
  });

  it("the next login prunes this user's own already-revoked and already-expired sessions, keeping still-valid ones", async () => {
    // Hand-insert what a login can't produce directly: an
    // already-revoked row and an already-expired-but-never-revoked
    // row, alongside the still-valid one from the previous test.
    await prisma.session.create({
      data: {
        tenantId: (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).tenantId,
        userId,
        refreshTokenHash: `revoked-${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(),
      },
    });
    await prisma.session.create({
      data: {
        tenantId: (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).tenantId,
        userId,
        refreshTokenHash: `expired-${Date.now()}`,
        expiresAt: new Date(Date.now() - 60_000), // already expired, never revoked
      },
    });

    const beforeCount = await prisma.session.count({ where: { userId } });
    expect(beforeCount).toBe(3); // 1 still-valid (from the prior login) + revoked + expired

    await request(app.getHttpServer()).post("/auth/login").send({ email, password }).expect(200);

    const remaining = await prisma.session.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    // The revoked and expired rows are gone; the still-valid row from
    // the first login survives untouched, plus the brand-new one this
    // login just issued.
    expect(remaining).toHaveLength(2);
    expect(remaining.every((s) => s.revokedAt === null)).toBe(true);
    expect(remaining.every((s) => s.expiresAt.getTime() > Date.now())).toBe(true);
  });

  it("pruning only ever touches this user's own sessions, never another user's", async () => {
    const otherEmail = `session-pruning-other-${Date.now()}@example.com`;
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const tenant = await prisma.tenant.create({ data: { name: "Other Tenant For Pruning Test" } });
    const otherUser = await prisma.user.create({
      data: { tenantId: tenant.id, email: otherEmail, name: "Other", passwordHash, emailVerifiedAt: new Date() },
    });
    // A revoked session belonging to a DIFFERENT user.
    await prisma.session.create({
      data: {
        tenantId: tenant.id,
        userId: otherUser.id,
        refreshTokenHash: `other-revoked-${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(),
      },
    });

    await request(app.getHttpServer()).post("/auth/login").send({ email, password }).expect(200);

    // The other user's revoked session is untouched by this user's login.
    const otherCount = await prisma.session.count({ where: { userId: otherUser.id } });
    expect(otherCount).toBe(1);

    await prisma.session.deleteMany({ where: { userId: otherUser.id } });
    await prisma.user.deleteMany({ where: { id: otherUser.id } });
    await prisma.tenant.deleteMany({ where: { id: tenant.id } });
  });
});
