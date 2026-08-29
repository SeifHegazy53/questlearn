// Module 10.5 / ADR 0005: thin server wrapper so generateStaticParams
// can exist for this dynamic segment (required by output:"export" for
// the static demo build) alongside the real, unmodified client page
// (moved verbatim to page-client.tsx -- "use client" pages can't
// export generateStaticParams directly in this Next.js version,
// confirmed by a real failed build attempt before adopting this
// pattern).
import ClientPage from "./page-client";
import { MOCK_CLASS_IDS } from "../../../lib/mock/mock-data";

// Never return a literal [] from generateStaticParams -- see
// activities/[id]/assign/page.tsx's comment.
export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [{ id: "unused" }];
  return Object.values(MOCK_CLASS_IDS).map((id) => ({ id }));
}

export default function Page() {
  return <ClientPage />;
}
