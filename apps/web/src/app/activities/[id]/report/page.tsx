import ClientPage from "./page-client";
import { MOCK_ACTIVITY_IDS } from "../../../../lib/mock/mock-data";

export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [];
  return [{ id: MOCK_ACTIVITY_IDS.fundamentals }];
}

export default function Page() {
  return <ClientPage />;
}
