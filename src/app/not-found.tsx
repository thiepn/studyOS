import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell system-state-shell">
      <section className="system-state">
        <span className="section-kicker">StudyOS</span>
        <h1>Nothing is here.</h1>
        <p>The study view may have moved, or the course/semester item no longer exists.</p>
        <div className="button-row">
          <Link className="primary-button" href="/">Today</Link>
          <Link className="secondary-button" href="/courses">Courses</Link>
        </div>
      </section>
    </main>
  );
}
