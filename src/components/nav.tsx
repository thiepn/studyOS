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
      <StudySyncBridge />
    </nav>
  );
}
