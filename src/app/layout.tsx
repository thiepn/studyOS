import type { Metadata } from "next";
import "./globals.css";
import "./academic-system.css";
import "./shell.css";
import "./today-workspace.css";
import "./course-binder.css";
import "./practice-focus.css";

export const metadata: Metadata = {
  title: "StudyOS",
  applicationName: "StudyOS",
  description: "University study planning, retrieval practice, retention, and exam-readiness workspace",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="studyos-skip-link" href="#studyos-main">Skip to study content</a>
        <div id="studyos-main" className="studyos-content-target" tabIndex={-1}>{children}</div>
      </body>
    </html>
  );
}
