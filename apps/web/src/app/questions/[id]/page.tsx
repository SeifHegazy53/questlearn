import ClientPage from "./page-client";
import { MOCK_QUESTION_IDS } from "../../../lib/mock/mock-data";

export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [];
  return Object.values(MOCK_QUESTION_IDS).map((id) => ({ id }));
}

export default function Page() {
  return <ClientPage />;
}
