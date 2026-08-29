import ClientPage from "./page-client";
import { MOCK_QUEST_ID } from "../../../lib/mock/mock-data";

export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [];
  return [{ id: MOCK_QUEST_ID }];
}

export default function Page() {
  return <ClientPage />;
}
