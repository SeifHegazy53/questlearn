// Module 10.5 / ADR 0005: INCLUDED in the static demo's navigation.
// Originally excluded as if it were a mutation-only page -- wrong,
// found and corrected during the ADR's correctness verification pass
// alongside the identical attempt-result gap. This page is entirely
// read-only (attempts, mastery, gamification, quests -- no button on
// it does anything), and it's exactly what "View report" on the
// class report's roster list links to for every learner with a real
// account, so excluding it left that real, always-visible link
// pointing at a page only ever generated for a placeholder id -- a
// real 404, confirmed by loading the built export. See mock-api.ts's
// getLearnerReport and mock-data.ts's MOCK_LEARNER_REPORT.
import ClientPage from "./page-client";
import { MOCK_CLASS_IDS, MOCK_LEARNER } from "../../../../../../lib/mock/mock-data";

export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [];
  return [{ id: MOCK_CLASS_IDS.earthScience, learnerId: MOCK_LEARNER.id }];
}

export default function Page() {
  return <ClientPage />;
}
