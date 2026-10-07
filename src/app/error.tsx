"use client";

import Link from "next/link";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell system-state-shell">
      <section className="system-state system-state-error" role="alert">
        <span className="section-kicker">StudyOS</span>
        <h1>This view could not be loaded.</h1>
        <p>Your saved study data has not been changed. Retry the request, or return to Today and continue from there.</p>
        {error.digest ? <small>Reference: {error.digest}</small> : null}
        <div className="button-row">
          <button className="primary-button button-reset" type="button" onClick={reset}>Retry</button>
          <Link className="secondary-button" href="/">Back to Today</Link>
        </div>
      </section>
    </main>
  );
}
