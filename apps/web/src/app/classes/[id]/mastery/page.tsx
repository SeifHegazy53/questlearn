import ClientPage from "./page-client";
import { MOCK_CLASS_IDS } from "../../../../lib/mock/mock-data";

export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [];
  return [{ id: MOCK_CLASS_IDS.earthScience }];
}

export default function Page() {
  return <ClientPage />;
}
