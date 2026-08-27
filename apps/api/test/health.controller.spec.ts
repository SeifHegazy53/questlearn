import { Test } from "@nestjs/testing";
import { HttpException, HttpStatus } from "@nestjs/common";
import { HealthController } from "../src/health/health.controller";
import { HealthReport, HealthService } from "../src/health/health.service";

/**
 * Module 10.4 / ADR 0004: proves the controller's status-code
 * behavior specifically -- HealthService's own report shape is
 * covered by health.service.spec.ts, this file only tests what the
 * controller does with that report (200 vs 503).
 */
describe("HealthController", () => {
  const getReport = jest.fn<Promise<HealthReport>, []>();
  let controller: HealthController;

  beforeEach(async () => {
    getReport.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: { getReport } }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  function report(overrides: Partial<HealthReport>): HealthReport {
    return {
      web: "running",
      api: "connected",
      database: "connected",
      redis: "connected",
      degraded: false,
      environment: "test",
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  it("returns the report directly (no throw) when the database is connected", async () => {
    const healthy = report({});
    getReport.mockResolvedValueOnce(healthy);

    await expect(controller.check()).resolves.toEqual(healthy);
  });

  it("returns 200 with degraded:true when only redis is disconnected", async () => {
    const degraded = report({ redis: "disconnected", degraded: true });
    getReport.mockResolvedValueOnce(degraded);

    await expect(controller.check()).resolves.toEqual(degraded);
  });

  it("throws a 503 HttpException carrying the full report body when the database is disconnected", async () => {
    const unhealthy = report({ database: "disconnected" });
    getReport.mockResolvedValueOnce(unhealthy);

    await expect(controller.check()).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });

    getReport.mockResolvedValueOnce(unhealthy);
    try {
      await controller.check();
      fail("expected controller.check() to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      // The full report -- not just a generic message -- is preserved
      // in the exception response, so a caller inspecting the error
      // body still sees exactly which dependency is down.
      expect((err as HttpException).getResponse()).toEqual(unhealthy);
    }
  });
});
