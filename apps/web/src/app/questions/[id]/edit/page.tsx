// Module 10.5 / ADR 0005: excluded from the static demo's navigation
// (a mutating page -- "Edit"). See activities/[id]/assign/page.tsx's
// comment for why this stub exists at all, and for the
// never-return-[] rule below.
import ClientPage from "./page-client";

export async function generateStaticParams() {
  return [{ id: "unused" }];
}

export default function Page() {
  return <ClientPage />;
}
