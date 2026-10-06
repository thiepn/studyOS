import Link from "next/link";
import { StudySyncBridge } from "@/components/study-sync-bridge";

export function Nav() {
  return (
    <nav className="nav" aria-label="Primary">
      <Link href="/">Today</Link>
      <Link href="/courses">Courses</Link>
      <Link href="/practice">Practice</Link>
      <Link href="/resources">Resources</Link>
      <Link href="/progress">Progress</Link>
      <Link href="/outlook">Outlook</Link>
      <Link href="/exam-command">Exam Command</Link>
      <Link href="/exam-day">Exam Day</Link>
      <Link href="/exam-results">Results</Link>
      <Link href="/scenarios">Scenarios</Link>
      <Link href="/week">Week</Link>
      <Link href="/handoff">Handoff</Link>
      <Link href="/quality">Quality</Link>
      <Link href="/setup">Setup</Link>
      <StudySyncBridge />
    </nav>
  );
}
