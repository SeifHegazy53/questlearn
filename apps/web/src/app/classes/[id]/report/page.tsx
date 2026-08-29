import ClientPage from "./page-client";
import { MOCK_CLASS_IDS } from "../../../../lib/mock/mock-data";

// Never return a literal [] from generateStaticParams -- see
// activities/[id]/assign/page.tsx's comment.
export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [{ id: "unused" }];
  return [{ id: MOCK_CLASS_IDS.earthScience }];
}

export default function Page() {
  return <ClientPage />;
}
