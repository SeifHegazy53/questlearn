"use client";

import { DEMO_MODE, IS_STATIC_DEMO } from "@/lib/demo-mode";

/**
 * Module 10.4 / ADR 0004: layout-level banner shown on every page of
 * the public demo build. Renders nothing at all when
 * NEXT_PUBLIC_DEMO_MODE isn't set -- every other environment (local
 * dev, CI, a future non-demo deployment of this same container) is
 * visually unaffected.
 *
 * Module 10.5 / ADR 0005: also renders in the static-demo build,
 * since it shares the same DEMO_MODE flag as of that ADR's
 * DemoModeAction fix -- but with different copy. The original
 * "sign in with the seeded demo teacher or learner account" line is
 * accurate for ADR 0004's live-backend demo (a real login form,
 * against a real backend, exists there); it's actively wrong here --
 * the static demo has no login at all, only the /demo role-picker.
 * Found by loading the built static export and seeing the live
 * banner text reference a sign-in flow that doesn't exist in this
 * build, right after wiring DEMO_MODE through for the button-disable
 * fix.
 */
export function DemoModeBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div
      data-testid="demo-mode-banner"
      role="status"
      style={{
        background: "var(--brand-primary)",
        color: "#fff",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: "var(--fw-medium)",
        textAlign: "center",
        padding: "8px 16px",
      }}
    >
      {IS_STATIC_DEMO ? (
        <>
          You&apos;re viewing a read-only static demo, seeded with real
          project data — nothing you do here is saved or sent
          anywhere, and creating, editing, and deleting are disabled.
        </>
      ) : (
        <>
          You&apos;re viewing a read-only public demo — sign in with
          the seeded demo teacher or learner account to look around;
          creating, editing, and deleting are disabled.
        </>
      )}
    </div>
  );
}
