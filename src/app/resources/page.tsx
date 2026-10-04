import { Nav } from "@/components/nav";
import { ResourceRegisterForm } from "@/components/resource-register-form";
import { IngestionDecisionButtons } from "@/components/ingestion-decision-buttons";
import { DriveControls } from "@/components/drive-controls";
import { ProcessingCandidateForm } from "@/components/processing-candidate-form";
import { getResourcesData } from "@/lib/study/resources";
import type { Json } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

function candidateCounts(payload: Json | null) {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") return { topics: 0, skills: 0, questions: 0 };
  const topics = Array.isArray(payload.topics) ? payload.topics : [];
  let skills = 0, questions = 0;
  for (const topic of topics) {
    if (!topic || Array.isArray(topic) || typeof topic !== "object") continue;
    const topicSkills = Array.isArray(topic.skills) ? topic.skills : [];
    skills += topicSkills.length;
    for (const skill of topicSkills) {
      if (!skill || Array.isArray(skill) || typeof skill !== "object") continue;
      questions += Array.isArray(skill.questions) ? skill.questions.length : 0;
    }
  }
  return { topics: topics.length, skills, questions };
}

export default async function ResourcesPage() {
  const data = await getResourcesData();
  const courseById = new Map(data.courses.map((course) => [course.id, course.display_name]));
  const resourceById = new Map(data.resources.map((resource) => [resource.id, resource]));
  const queued = data.ingestionRuns.filter((run) => run.status === "queued");
  const candidates = data.ingestionRuns.filter((run) => run.status === "candidate");
  const drive = data.driveConnection;
  const unresolvedIntake = data.intakeItems.filter((item) => item.status !== "registered" && item.status !== "ignored");

  return (
    <main className="shell">
      <header className="header"><div><p className="eyebrow">Source pipeline</p><h1>Resources</h1></div><Nav /></header>

      <section className="panel drive-panel">
        <div className="section-heading"><div><p className="eyebrow">Separate integration</p><h2>Study Drive</h2></div><span>{drive?.status === "connected" ? "On" : "Off"}</span></div>
        <DriveControls connected={drive?.status === "connected"} email={drive?.google_account_email} inboxUrl={drive?.inbox_folder_url} lastScanAt={drive?.last_scan_at} lastScanStatus={drive?.last_scan_status} />
      </section>

      <section className="panel processing-queue-panel">
        <div className="section-heading"><div><p className="eyebrow">Source-grounded processing</p><h2>Processing queue</h2></div><span>{queued.length}</span></div>
        <p className="muted">Queued academic sources are not allowed into the study map until they have a source-anchored topic/skill/question candidate and you explicitly accept it.</p>
        {queued.length ? <div className="processing-list">{queued.map((run) => {
          const resource = resourceById.get(run.resource_id);
          return <ProcessingCandidateForm key={run.id} runId={run.id} resourceTitle={resource?.title ?? "Resource"} courseName={courseById.get(run.course_id) ?? "Course"} />;
        })}</div> : <p className="muted">No source is waiting for semantic processing.</p>}
      </section>

      <section className="grid resource-grid">
        <div className="panel">
          <h2>Manual registration</h2>
          <p className="muted">Normally, Drive scanning discovers material automatically. Use this only when you need to register one file manually.</p>
          <ResourceRegisterForm courses={data.courses} />
        </div>
        <div className="panel">
          <h2>Extraction review</h2>
          {candidates.length ? candidates.map((run) => {
            const resource = resourceById.get(run.resource_id);
            const count = candidateCounts(run.candidate_payload);
            const issues = Array.isArray(run.validation_issues) ? run.validation_issues : [];
            const blocking = issues.filter((issue) => issue && typeof issue === "object" && !Array.isArray(issue) && (issue as Record<string, unknown>).severity === "error").length;
            return <article className="ingestion-card" key={run.id}><div className="status-line"><strong>{resource?.title ?? "Resource"}</strong><span>{blocking ? `${blocking} blocking` : "Needs review"}</span></div><p>{courseById.get(run.course_id) ?? "Course"} · {count.topics} topics · {count.skills} skills · {count.questions} questions</p>{issues.length ? <><p className="warning-text">{issues.length} validation issue(s); blocking errors must be corrected before acceptance.</p><details className="validation-details"><summary>Validation details</summary><ul>{issues.map((issue, index) => { const item = issue && typeof issue === "object" && !Array.isArray(issue) ? issue as Record<string, unknown> : {}; return <li key={index}><strong>{String(item.severity ?? "info")}</strong> · {String(item.message ?? item.code ?? "Validation issue")}</li>; })}</ul></details></> : null}<IngestionDecisionButtons runId={run.id} disableAccept={blocking > 0} /></article>;
          }) : <p className="muted">No extraction candidate is waiting for approval.</p>}
        </div>
      </section>

      <section className="panel resource-library">
        <div className="section-heading"><div><p className="eyebrow">Drive discovery</p><h2>Intake queue</h2></div><span>{unresolvedIntake.length}</span></div>
        {unresolvedIntake.length ? <div className="resource-list">{unresolvedIntake.map((item) => <article key={item.id}><div><strong>{item.title}</strong><span className="status-pill">{item.status.replace("_", " ")}</span></div><p>{item.course_id ? (courseById.get(item.course_id) ?? "Course") : "Course unresolved"} · {item.detected_resource_type ?? "type unresolved"}{item.detected_week_no ? ` · W${item.detected_week_no}` : ""}{item.classification_confidence != null ? ` · ${Math.round(item.classification_confidence * 100)}% classifier` : ""}</p>{item.drive_url ? <a href={item.drive_url} target="_blank" rel="noreferrer">Open file</a> : null}{item.note ? <p className="muted">{item.note}</p> : null}</article>)}</div> : <p className="muted">No unresolved Drive files.</p>}
      </section>

      <section className="panel resource-library">
        <div className="section-heading"><div><p className="eyebrow">Archive index</p><h2>Registered resources</h2></div><span>{data.resources.length}</span></div>
        {data.resources.length ? <div className="resource-list">{data.resources.map((resource) => <article key={resource.id}><div><strong>{resource.title}</strong><span className={`status-pill status-${resource.processing_status}`}>{resource.processing_status.replace("_", " ")}</span></div><p>{courseById.get(resource.course_id) ?? "Course"} · {resource.resource_type.replace("_", " ")} · {resource.source_authority.replace("_", " ")}</p>{resource.drive_url ? <a href={resource.drive_url} target="_blank" rel="noreferrer">Open source file</a> : null}</article>)}</div> : <p className="muted">No course material registered yet.</p>}
      </section>
    </main>
  );
}
