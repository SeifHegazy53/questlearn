// Module 10.5 / ADR 0005: excluded from the static demo's navigation.
// See activities/[id]/assign/page.tsx's comment for why this stub
// exists at all.
import ClientPage from "./page-client";

export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [];
  return [{ id: "unused" }];
}

export default function Page() {
  return <ClientPage />;
}
