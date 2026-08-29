// Module 10.5 / ADR 0005: excluded from the static demo's navigation
// (a mutating page -- "Assign" -- nothing to demo without a backend),
// but output:"export" still requires a generateStaticParams export for
// every dynamic segment in the tree. See page-client.tsx for the real,
// unmodified page.
import ClientPage from "./page-client";

// Never return a literal [] from generateStaticParams, in ANY build --
// a real, confirmed Next.js bug class (vercel/next.js#71862, and a
// second instance of it found via a real CI investigation on Module
// 10.5's PR #20): a route whose generateStaticParams returns a
// genuinely empty array gets treated as having no dynamic fallback at
// all (a "NoFallbackError", 404ing every real id), reproducible three
// times in a row on real GitHub Actions CI, never reproducible in an
// exhaustive from-scratch local/container investigation. This
// placeholder-id workaround was already in place for output:"export";
// this normal (non-static-demo) build needs the exact same treatment.
export async function generateStaticParams() {
  return [{ id: "unused" }];
}

export default function Page() {
  return <ClientPage />;
}
