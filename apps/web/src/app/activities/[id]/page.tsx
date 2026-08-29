// Module 10.5 / ADR 0005: thin server wrapper so generateStaticParams
// can exist for this dynamic segment (required by output:"export" for
// the static demo build) alongside the real, unmodified client page
// (moved verbatim to page-client.tsx -- "use client" pages can't
// export generateStaticParams directly in this Next.js version,
// confirmed by a real failed build attempt before adopting this
// pattern).
import ClientPage from "./page-client";
import { MOCK_ACTIVITY_IDS } from "../../../lib/mock/mock-data";

// Never return a literal [] from generateStaticParams, in ANY build --
// see activities/[id]/assign/page.tsx's comment for the real,
// confirmed Next.js bug class this avoids (a "NoFallbackError" that
// 404s every real id, reproduced three times on real GitHub Actions
// CI, never reproducible locally). Outside the static-demo build this
// generates one harmless extra static page for a placeholder id that
// nothing links to -- functionally equivalent to this file not
// existing, for every real id.
export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [{ id: "unused" }];
  return Object.values(MOCK_ACTIVITY_IDS).map((id) => ({ id }));
}

export default function Page() {
  return <ClientPage />;
}
