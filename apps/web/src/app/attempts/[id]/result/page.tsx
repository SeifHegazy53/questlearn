// Module 10.5 / ADR 0005: INCLUDED in the static demo's navigation.
// Originally treated as an "excluded, mutation-only" stub like its
// sibling `assign`/`preview`/`edit` pages -- wrong, found and
// corrected during the ADR's correctness verification pass. This
// page has no mutation at all (no autosave, no submit, no answer
// editing, just a graded attempt's read-only review), and it's what
// every submitted row on the learner dashboard actually links to, so
// excluding it left every one of those real, always-visible links
// pointing at a page that was never statically generated -- a real
// 404 on GitHub Pages, confirmed by loading the built export and
// clicking through. See mock-api.ts's getAttempt and mock-data.ts's
// MOCK_ATTEMPT_DETAILS.
import ClientPage from "./page-client";
import { MOCK_ATTEMPT_IDS } from "../../../../lib/mock/mock-data";

// Never return a literal [] from generateStaticParams -- see
// activities/[id]/assign/page.tsx's comment.
export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [{ id: "unused" }];
  return Object.values(MOCK_ATTEMPT_IDS).map((id) => ({ id }));
}

export default function Page() {
  return <ClientPage />;
}
