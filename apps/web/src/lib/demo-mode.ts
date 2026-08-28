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
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_MODE_MESSAGE =
  "Disabled in the public demo — this would modify shared data. Clone the repo to try it locally.";
