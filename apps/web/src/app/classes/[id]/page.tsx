// Module 10.5 / ADR 0005: thin server wrapper so generateStaticParams
// can exist for this dynamic segment (required by output:"export" for
// the static demo build) alongside the real, unmodified client page
// (moved verbatim to page-client.tsx -- "use client" pages can't
// export generateStaticParams directly in this Next.js version,
// confirmed by a real failed build attempt before adopting this
// pattern). Returns [] outside the static-demo build, which is
// functionally identical to this file not existing at all in every
// other build (local dev, CI, Module 10.4's Docker image) -- nothing
// about their runtime behavior changes.
import ClientPage from "./page-client";
import { MOCK_CLASS_IDS } from "../../../lib/mock/mock-data";

export async function generateStaticParams() {
  if (process.env.STATIC_DEMO !== "true") return [];
  return Object.values(MOCK_CLASS_IDS).map((id) => ({ id }));
}

export default function Page() {
  return <ClientPage />;
}
