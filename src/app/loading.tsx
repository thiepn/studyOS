export default function Loading() {
  return (
    <main className="shell system-state-shell" aria-busy="true" aria-live="polite">
      <div className="system-state">
        <span className="section-kicker">StudyOS</span>
        <h1>Loading your study state…</h1>
        <div className="state-progress" aria-hidden="true"><i /></div>
        <p>Fetching the current semester, study queue, and planning state.</p>
      </div>
    </main>
  );
}
