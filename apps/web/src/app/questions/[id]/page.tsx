import ClientPage from "./page-client";
import { MOCK_QUESTION_IDS } from "../../../lib/mock/mock-data";

// Never return a literal [] from generateStaticParams -- see
// activities/[id]/assign/page.tsx's comment.
export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [{ id: "unused" }];
  return Object.values(MOCK_QUESTION_IDS).map((id) => ({ id }));
}

export default function Page() {
  return <ClientPage />;
}
