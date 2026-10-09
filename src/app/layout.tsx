import type { Metadata } from "next";
import "./globals.css";
import "./academic-system.css";

export const metadata: Metadata = {
  title: "StudyOS",
  applicationName: "StudyOS",
  description: "University study planning, retrieval practice, retention, and exam-readiness workspace",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
