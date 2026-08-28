import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "../support/test-app";
import { PrismaService } from "../../src/prisma/prisma.service";
import * as argon2 from "argon2";

/**
 * Module 10.4 / ADR 0004: proves DemoModeGuard's real HTTP behavior
 * end to end -- built with DEMO_MODE=true set before the app compiles
 * (EnvModule's factory reads process.env fresh per compile), restored
 * afterward so it can't leak into other test files sharing this Jest
 * worker.
 */
describe("DemoModeGuard (integration, DEMO_MODE=true)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const originalDemoMode = process.env.DEMO_MODE;

  const teacherEmail = `demo-mode-teacher-${Date.now()}@example.com`;
  const password = "correcthorse123";
  let teacherToken: string;
  let tenantId: string;

  beforeAll(async () => {
    process.env.DEMO_MODE = "true";
    app = await createTestApp();
    prisma = app.get(PrismaService);

    // Created directly via Prisma, not POST /auth/register -- that
    // route is itself blocked under demo mode (it's not one of the
    // three allowlisted paths), matching the real demo's posture of
    // only pre-seeded accounts existing.
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const tenant = await prisma.tenant.create({ data: { name: "Demo Mode Tenant" } });
    tenantId = tenant.id;
    await prisma.user.create({
      data: { tenantId: tenant.id, email: teacherEmail, name: "Teacher", passwordHash, emailVerifiedAt: new Date() },
    });
  });

  afterAll(async () => {
    if (tenantId) {
      await prisma.user.deleteMany({ where: { tenantId } });
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    await app.close();
    if (originalDemoMode === undefined) {
      delete process.env.DEMO_MODE;
    } else {
      process.env.DEMO_MODE = originalDemoMode;
    }
  });

  it("POST /auth/login is allowlisted and still works under DEMO_MODE", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: teacherEmail, password })
      .expect(200);
    teacherToken = res.body.accessToken;
    expect(teacherToken).toEqual(expect.any(String));
  });

  it("GET requests are never blocked by demo mode", async () => {
    await request(app.getHttpServer())
      .get("/classes")
      .set("Authorization", `Bearer ${teacherToken}`)
      .expect(200);
  });

  it("a mutating request (POST /classes) is rejected with 403 and a clear read-only message", async () => {
    const res = await request(app.getHttpServer())
      .post("/classes")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ name: "Should Never Be Created" })
      .expect(403);

    expect(res.body.message).toMatch(/read-only public demo/i);

    const created = await prisma.class.findFirst({ where: { tenantId, name: "Should Never Be Created" } });
    expect(created).toBeNull();
  });

  it("PATCH and DELETE are rejected the same way (not just POST)", async () => {
    const cls = await prisma.class.create({
      data: {
        tenantId,
        teacherId: (await prisma.user.findFirstOrThrow({ where: { tenantId } })).id,
        name: "Pre-seeded Class",
        joinCode: "DEMOAB12",
        joinCodeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await request(app.getHttpServer())
      .patch(`/classes/${cls.id}`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ name: "Renamed" })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/classes/${cls.id}/roster/nonexistent-id`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .expect(403);

    await prisma.class.deleteMany({ where: { id: cls.id } });
  });

  it("POST /auth/refresh is allowlisted -- demo mode never blocks it (reaches real auth/CSRF logic instead of the demo-mode 403)", async () => {
    // No CSRF cookie/header attached, so CsrfGuard's own 403 ("Invalid
    // or missing CSRF token") fires before AuthService ever runs --
    // the point of this test is only that it's NOT DemoModeGuard's
    // 403, proving the allowlist actually bypassed that guard rather
    // than this request coincidentally succeeding some other way.
    const res = await request(app.getHttpServer()).post("/auth/refresh");
    expect(res.body.message).not.toMatch(/read-only public demo/i);
  });

  it("POST /auth/logout is allowlisted -- reaches real auth logic instead of the demo-mode 403", async () => {
    const res = await request(app.getHttpServer()).post("/auth/logout").send({});
    expect(res.body.message ?? "").not.toMatch(/read-only public demo/i);
  });

  it("POST /auth/register is NOT allowlisted -- blocked the same as any other mutation", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: `blocked-${Date.now()}@example.com`, password: "correcthorse123", name: "Blocked" })
      .expect(403);
    expect(res.body.message).toMatch(/read-only public demo/i);
  });
});
