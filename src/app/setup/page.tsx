import Link from "next/link";
import { Nav } from "@/components/nav";
import { getReadinessData } from "@/lib/study/readiness";
import { WS2627_COURSES, WS2627_START_DATE } from "@/lib/study/semester-config";

export const dynamic = "force-dynamic";

function Check({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <article className={`readiness-check ${ok ? "ready" : "blocked"}`}>
      <span aria-hidden="true">{ok ? "✓" : "!"}</span>
      <div><strong>{title}</strong><p>{detail}</p></div>
    </article>
  );
}

export default async function SetupPage() {
  const data = await getReadinessData();
  const { server, backend, evaluation } = data;
  return (
    <main className="shell">
      <header className="header">
        <div><p className="eyebrow">P6 · Production readiness</p><h1>Semester setup</h1></div>
        <Nav />
      </header>

      <section className={`panel readiness-hero ${evaluation.infrastructureReady ? "ready" : "blocked"}`}>
        <p className="eyebrow">Infrastructure</p>
        <h2>{evaluation.infrastructureReady ? "Ready for semester operation" : "Setup still required"}</h2>
        <p>WS26/27 begins {new Date(`${WS2627_START_DATE}T12:00:00+02:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Code readiness and account readiness are tracked separately.</p>
        {evaluation.blockers.length ? <ul>{evaluation.blockers.map((item) => <li key={item}>{item}</li>)}</ul> : null}
      </section>

      <section className="readiness-grid">
        <div className="panel">
          <p className="eyebrow">Deployment environment</p>
          <h2>Server configuration</h2>
          <div className="readiness-list">
            <Check ok={server.hasSupabaseSecret} title="Supabase server secret" detail="Required for server-only Drive credential operations." />
            <Check ok={server.secureOrigin} title="Stable HTTPS origin" detail={server.appOrigin} />
            <Check ok={server.googleDriveConfigured} title="Google Drive OAuth" detail="Client ID, client secret, and encrypted-token key are configured." />
            <Check ok={server.googleCalendarConfigured} title="Google Calendar OAuth" detail="Separate Study Calendar credentials are available (or securely reuse the Study Drive OAuth app)." />
          </div>
          <div className="callback-list">
            <div><span>Supabase auth redirect</span><code>{server.authCallbackUrl}</code></div>
            <div><span>Study Drive OAuth redirect</span><code>{server.googleDriveCallbackUrl}</code></div>
            <div><span>Study Calendar OAuth redirect</span><code>{server.googleCalendarCallbackUrl}</code></div>
          </div>
          <p className="muted tiny">{server.deploymentEnv} · {server.buildSha ? server.buildSha.slice(0, 12) : "local/unversioned runtime"}</p>
        </div>

        <div className="panel">
          <p className="eyebrow">Workspace</p>
          <h2>Live semester state</h2>
          <div className="readiness-list">
            <Check ok={Boolean(backend.workspace_initialized)} title="Semester workspace" detail="WS26/27 exists in the THIEPN Account database." />
            <Check ok={Boolean(backend.courses_ready)} title="Six real courses" detail={`${backend.named_course_count ?? 0} / 6 named and active`} />
            <Check ok={Boolean(backend.drive_connected)} title="Study Google account" detail="Independent from the Google account connected to ChatGPT." />
            <Check ok={Boolean(backend.drive_tree_ready)} title="Drive tree" detail="Semester root, inbox, and all six course folders exist." />
            <Check ok={data.calendarConnection?.status === "connected"} title="Study Calendar account" detail={data.calendarConnection?.google_account_email ?? "Independent calendar account not connected yet."} />
          </div>
          <div className="button-row"><Link className="primary-button" href="/resources">Connect / inspect Drive</Link><Link className="secondary-button" href="/courses">Inspect courses</Link></div>
        </div>
      </section>

      <section className="panel readiness-courses">
        <div className="section-heading"><div><p className="eyebrow">Course onboarding</p><h2>WS26/27 course contract</h2></div><span>{backend.course_count ?? 0}/6</span></div>
        <div className="onboarding-course-list">
          {WS2627_COURSES.map((course) => <div key={course.stableKey}><strong>{course.displayName}</strong><span>{course.kind === "retake" ? "retake" : course.shortName}</span></div>)}
        </div>
      </section>

      <section className="panel first-material-card">
        <div className="section-heading"><div><p className="eyebrow">End-to-end proof</p><h2>First real material</h2></div><span>{evaluation.firstWeekOperational ? "ready" : "pending"}</span></div>
        <p>
          Infrastructure can be ready before lectures begin. Full end-to-end certification additionally requires one real verified source to produce at least one skill and one review question.
        </p>
        <div className="readiness-stats">
          <span><strong>{backend.verified_resource_count ?? 0}</strong> verified resources</span>
          <span><strong>{backend.skill_count ?? 0}</strong> skills</span>
          <span><strong>{backend.question_count ?? 0}</strong> questions</span>
        </div>
        <div className="button-row"><Link className="secondary-button" href="/resources">Open material intake</Link><Link className="secondary-button" href="/practice">Open practice</Link></div>
      </section>
    </main>
  );
}
