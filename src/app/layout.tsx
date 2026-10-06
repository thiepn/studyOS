import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Semester OS",
  description: "Semester learning, retention, exam-readiness, and academic outcome system",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
