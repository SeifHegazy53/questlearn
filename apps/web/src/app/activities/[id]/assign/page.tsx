// Module 10.5 / ADR 0005: excluded from the static demo's navigation
// (a mutating page -- "Assign" -- nothing to demo without a backend),
// but output:"export" still requires a generateStaticParams export for
// every dynamic segment in the tree. See page-client.tsx for the real,
// unmodified page.
import ClientPage from "./page-client";

export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return []; // [] alone is fine outside the static-demo build (a real known Next.js bug only bites under output:"export")
  return [{ id: "unused" }]; // workaround: Next.js mishandles a genuinely empty array under output:"export" (vercel/next.js#71862)
}

export default function Page() {
  return <ClientPage />;
}
