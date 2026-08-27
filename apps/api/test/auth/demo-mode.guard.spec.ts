import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { DemoModeGuard } from "../../src/auth/guards/demo-mode.guard";

function contextFor(method: string, path: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, path }),
    }),
  } as unknown as ExecutionContext;
}

describe("DemoModeGuard (unit)", () => {
  it("allows everything when DEMO_MODE is false", () => {
    const guard = new DemoModeGuard({ DEMO_MODE: false } as never);
    expect(guard.canActivate(contextFor("POST", "/classes"))).toBe(true);
    expect(guard.canActivate(contextFor("DELETE", "/classes/1"))).toBe(true);
  });

  it("allows GET requests even when DEMO_MODE is true", () => {
    const guard = new DemoModeGuard({ DEMO_MODE: true } as never);
    expect(guard.canActivate(contextFor("GET", "/classes"))).toBe(true);
  });

  it("blocks POST/PATCH/DELETE to a non-allowlisted path when DEMO_MODE is true", () => {
    const guard = new DemoModeGuard({ DEMO_MODE: true } as never);
    for (const method of ["POST", "PATCH", "DELETE"]) {
      expect(() => guard.canActivate(contextFor(method, "/classes"))).toThrow(ForbiddenException);
    }
  });

  it("allows exactly the three allowlisted paths when DEMO_MODE is true", () => {
    const guard = new DemoModeGuard({ DEMO_MODE: true } as never);
    expect(guard.canActivate(contextFor("POST", "/auth/login"))).toBe(true);
    expect(guard.canActivate(contextFor("POST", "/auth/refresh"))).toBe(true);
    expect(guard.canActivate(contextFor("POST", "/auth/logout"))).toBe(true);
  });

  it("does NOT allow a path that merely starts with an allowlisted prefix (exact match only)", () => {
    const guard = new DemoModeGuard({ DEMO_MODE: true } as never);
    expect(() => guard.canActivate(contextFor("POST", "/auth/login/extra"))).toThrow(ForbiddenException);
  });

  it("does NOT allow /auth/register -- it's a real mutation, not one of the three allowlisted routes", () => {
    const guard = new DemoModeGuard({ DEMO_MODE: true } as never);
    expect(() => guard.canActivate(contextFor("POST", "/auth/register"))).toThrow(ForbiddenException);
  });
});
