import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Semester OS",
  description: "Retention and exam-readiness system for WS26/27",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
