import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Semester OS",
  description: "Retention and exam-readiness system for WS26/27",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
