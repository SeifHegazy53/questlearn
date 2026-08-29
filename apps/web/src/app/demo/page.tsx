"use client";

/**
 * Module 10.5 / ADR 0005: the static demo's actual entry point.
 * "View as Teacher" / "View as Learner" set a mock role via
 * `applySession` (localStorage-backed, see mock-auth-context.tsx) and
 * route straight into /dashboard -- no login form, since there's no
 * backend to authenticate against.
 *
 * This page imports the mock modules DIRECTLY (not through the
 * `@/lib/auth-context` / `@/lib/api` alias every other reused page
 * goes through) since it only exists for this build variant in the
 * first place. In a normal (non-static-demo) build this route still
 * exists in the bundle but renders a short "not available here" notice
 * instead of ever touching mock data, so it's inert rather than
 * showing fake content inside a real deployment.
 */
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@questlearn/design-system";
// Imported via the same "@/lib/auth-context" specifier every other
// page uses (not a direct "@/lib/mock/mock-auth-context" import) so
// this resolves to the SAME module instance the root layout's
// <AuthProvider> uses -- webpack's alias (next.config.js, static-demo
// build only) makes that the mock context; importing the mock module
// directly here created a second, distinct Context instance and broke
// useAuth() during prerendering (confirmed by a real failed build).
import { useAuth } from "@/lib/auth-context";
import { MOCK_LEARNER, MOCK_TEACHER, MOCK_TENANT_NAME } from "@/lib/mock/mock-data";

const IS_STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

function DemoRolePicker() {
  const router = useRouter();
  const { applySession } = useAuth();

  function enterAs(role: "teacher" | "learner") {
    const user = role === "teacher" ? MOCK_TEACHER : MOCK_LEARNER;
    applySession("mock-access-token", user);
    router.push("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 48,
        fontFamily: "var(--font-ui)",
        background: "var(--surface-page)",
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: "var(--fw-semibold)", margin: 0 }}>
          QuestLearn — static demo
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 8, maxWidth: 480 }}>
          A read-only snapshot of {MOCK_TENANT_NAME}, using the project&apos;s real seeded
          demo data. No backend, no login, nothing you do here is saved or sent
          anywhere.
        </p>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <Button variant="primary" size="lg" onClick={() => enterAs("teacher")}>
          View as Teacher ({MOCK_TEACHER.name})
        </Button>
        <Button variant="secondary" size="lg" onClick={() => enterAs("learner")}>
          View as Learner ({MOCK_LEARNER.name})
        </Button>
      </div>

      <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 480 }}>
        Want the full read/write app? Clone{" "}
        <a href="https://github.com/SeifHegazy53/questlearn" style={{ color: "var(--brand-primary)" }}>
          the repository
        </a>{" "}
        and run it locally.
      </p>
    </main>
  );
}

export default function DemoEntryPage() {
  if (!IS_STATIC_DEMO) {
    return (
      <main style={{ padding: 48, fontFamily: "var(--font-ui)" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          This route is only available in the static demo build. See{" "}
          <Link href="/" style={{ color: "var(--brand-primary)" }}>the home page</Link>{" "}
          or run the app locally to sign in for real.
        </p>
      </main>
    );
  }

  return <DemoRolePicker />;
}
