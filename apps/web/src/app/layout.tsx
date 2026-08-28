import type { Metadata } from "next";
import "@questlearn/design-system/styles.css";
import { AuthProvider } from "@/lib/auth-context";
import { DemoModeBanner } from "@/components/DemoModeBanner";

export const metadata: Metadata = {
  title: "QuestLearn",
  description: "Turn every lesson into a learning quest.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DemoModeBanner />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
