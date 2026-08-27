import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Request } from "express";
import { Env } from "@questlearn/config";
import { ENV } from "../../config/env.module";

/**
 * Module 10.4 / ADR 0004: default-deny mutation guard for the public
 * portfolio demo. Active only when `DEMO_MODE=true` (unset/false in
 * every other environment — local dev, CI, and any non-demo
 * deployment are completely unaffected by this guard's existence).
 *
 * Default-deny, not a denylist: every request whose method is POST,
 * PATCH, or DELETE is rejected UNLESS its path is in the explicit
 * allowlist below. This is deliberate — the safety property (the
 * demo's shared, seeded data can't be mutated by an anonymous
 * visitor) has to hold even if a future module adds a new mutating
 * route and never thinks about demo mode at all. A denylist would
 * require every future route to remember to add itself; a
 * default-deny allowlist requires nothing from future code.
 *
 * The three allowlisted routes are exactly what the demo needs:
 * visitors log in as (and stay logged in via silent refresh as, and
 * can log out of) the pre-seeded demo teacher/learner accounts.
 * Every other flow the demo supports — browsing classes, questions,
 * activities, mastery, reports, XP, quests — is a GET. Registering a
 * new account, joining a class as a new learner, creating/editing/
 * archiving anything, and submitting a new attempt are all real
 * mutations the live app supports but the demo doesn't need to, and
 * this guard blocks all of them without a single route-specific
 * exception beyond the three named here.
 */
const MUTATING_METHODS = new Set(["POST", "PATCH", "DELETE"]);
const ALLOWED_PATHS = new Set(["/auth/login", "/auth/refresh", "/auth/logout"]);

@Injectable()
export class DemoModeGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.env.DEMO_MODE) return true;

    const request = context.switchToHttp().getRequest<Request>();
    if (!MUTATING_METHODS.has(request.method)) return true;

    // request.path excludes the query string; the allowlist is
    // matched on exact path, not prefix, so nothing under e.g.
    // /auth/login/anything accidentally slips through.
    if (ALLOWED_PATHS.has(request.path)) return true;

    throw new ForbiddenException(
      "This is a read-only public demo. Creating, editing, and deleting are disabled — clone the repo to try the full app.",
    );
  }
}
