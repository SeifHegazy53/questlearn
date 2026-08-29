/**
 * Module 10.4 / ADR 0004: whether this build is the public read-only
 * demo. Inlined at build time (Next.js NEXT_PUBLIC_* convention) --
 * a build produced with this unset/false is completely unaffected,
 * same as every environment before this module. Mirrors the backend's
 * DEMO_MODE flag but is a SEPARATE flag by design: the backend's
 * DemoModeGuard is what actually enforces read-only-ness (server-
 * side, unconditionally correct regardless of what the frontend
 * renders); this flag only controls whether the UI proactively
 * explains that to a visitor instead of letting them hit a live 403.
 *
 * Module 10.5 / ADR 0005: also true for the static-demo build. That
 * build has no backend at all to 403 -- its `lib/api.ts` swap makes
 * every mutating call an unhandled rejection with no user-facing
 * message instead (see mock-api.ts's NOT_WIRED) -- so this flag is
 * exactly as necessary there, and reusing it means the static demo
 * gets Module 10.4's exact disabled-button-with-tooltip treatment for
 * free rather than needing its own.
 */
export const IS_STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || IS_STATIC_DEMO;

export const DEMO_MODE_MESSAGE =
  "Disabled in the public demo — this would modify shared data. Clone the repo to try it locally.";
