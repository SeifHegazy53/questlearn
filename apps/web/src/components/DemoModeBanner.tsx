"use client";

import { DEMO_MODE } from "@/lib/demo-mode";

/**
 * Module 10.4 / ADR 0004: layout-level banner shown on every page of
 * the public demo build. Renders nothing at all when
 * NEXT_PUBLIC_DEMO_MODE isn't set -- every other environment (local
 * dev, CI, a future non-demo deployment of this same container) is
 * visually unaffected.
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
      You&apos;re viewing a read-only public demo — sign in with the
      seeded demo teacher or learner account to look around; creating,
      editing, and deleting are disabled.
    </div>
  );
}
