import Link from "next/link";
import { Nav } from "@/components/nav";
import { parseTeachingWeek, scopeCourseRecords } from "@/lib/study/course-study-flow";
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

export default async function ResourcesPage({searchParams}:{searchParams:Promise<{course?:string;week?:string;drive?:string}>}) {
  const query=await searchParams;
  const driveMessages: Record<string,string> = {
    connected: "Google Drive authorized and StudyOS folders created.",
    permission_required: "Google granted only your basic profile, not Drive access. Select Connect Google Drive again, then explicitly approve the Drive file-access permission in Google's consent screen.",
    permission_denied: "Google Drive permission was declined. Reconnect and grant Drive file access to use this integration.",
    oauth_error: "Google authorization was interrupted or expired. Start a new connection from this page; don't refresh an old OAuth callback URL.",
    no_refresh_token: "Google did not return a persistent Drive authorization. Reconnect and approve the requested permissions.",
    setup_failed: "Google authorized Drive, but StudyOS couldn't finish preparing its folders. Reconnect to retry setup.",
    callback_failed: "Google Drive authorization couldn't be completed. Please start a new connection instead of refreshing the callback URL.",
  };
  const driveMessage=query.drive?driveMessages[query.drive]:null;
  const data = await getResourcesData();
  const selectedCourse=data.courses.find(item=>item.id===query.course)??null;
  const selectedWeek=selectedCourse?parseTeachingWeek(query.week):null;
  const resources=scopeCourseRecords(data.resources,selectedCourse?.id??null);
  const ingestionRuns=scopeCourseRecords(data.ingestionRuns,selectedCourse?.id??null);
  const intakeItems=scopeCourseRecords(data.intakeItems,selectedCourse?.id??null);
  const courseById = new Map(data.courses.map((course) => [course.id, course.display_name]));
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  const queued = ingestionRuns.filter((run) => run.status === "queued");
  const candidates = ingestionRuns.filter((run) => run.status === "candidate");
  const drive = data.driveConnection;
  const unresolvedIntake = intakeItems.filter((item) => item.status !== "registered" && item.status !== "ignored");

  return (
    <main className="shell">
      <header className="header"><div><p className="eyebrow">{selectedCourse?"Course source desk":"Source pipeline"}</p><h1>{selectedCourse?selectedCourse.display_name+" · Materials":"Resources"}</h1></div><Nav /></header>
      {selectedCourse?<div className="resource-context-nav">
        <p>{selectedWeek?`Preparing week ${selectedWeek} · `:""}Materials, processing and approval remain within this course.</p>
        <Link href={"/courses/"+selectedCourse.id}>← Course binder</Link>
        <Link href="/resources">All materials</Link>
      </div>:query.course?<p className="error" role="status">The requested course is not active in this semester. Showing the current semester's materials.</p>:null}

      {driveMessage ? <p className={query.drive==="connected"?"form-message":"error"} role="status">{driveMessage}</p> : null}

      <section className="panel drive-panel">
        <div className="section-heading"><div><p className="eyebrow">Separate integration</p><h2>Study Drive</h2></div><span>{drive?.status === "connected" ? "On" : "Off"}</span></div>
        <DriveControls connected={drive?.status === "connected"} email={drive?.google_account_email} inboxUrl={drive?.inbox_folder_url} lastScanAt={drive?.last_scan_at} lastScanStatus={drive?.last_scan_status} lastError={drive?.last_error} />
      </section>

      <section id="processing-queue" className="panel processing-queue-panel">
        <div className="section-heading"><div><p className="eyebrow">Source-grounded processing</p><h2>Processing queue</h2></div><span>{queued.length}</span></div>
        <p className="muted">Queued academic sources are not allowed into the study map until they have a source-anchored topic/skill/question candidate and you explicitly accept it.</p>
        {queued.length ? <div className="processing-list">{queued.map((run) => {
          const resource = resourceById.get(run.resource_id);
          return <ProcessingCandidateForm key={run.id} runId={run.id} resourceTitle={resource?.title ?? "Resource"} courseName={courseById.get(run.course_id) ?? "Course"} />;
        })}</div> : <p className="muted">No source is waiting for semantic processing.</p>}
      </section>

      <section id="manual-registration" className="grid resource-grid">
        <div className="panel">
          <h2>Manual registration</h2>
          <p className="muted">Normally, Drive scanning discovers material automatically. Use this only when you need to register one file manually.</p>
          <ResourceRegisterForm courses={data.courses} defaultCourseId={selectedCourse?.id} defaultWeekNo={selectedWeek} />
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
        <div className="section-heading"><div><p className="eyebrow">Source index</p><h2>Registered resources</h2></div><span>{resources.length}</span></div>
        {resources.length ? <div className="resource-list">{resources.map((resource) => <article key={resource.id}><div><strong>{resource.title}</strong><span className={`status-pill status-${resource.processing_status}`}>{resource.processing_status.replace("_", " ")}</span></div><p>{courseById.get(resource.course_id) ?? "Course"} · {resource.resource_type.replace("_", " ")} · {resource.source_authority.replace("_", " ")}</p>{resource.drive_url ? <a href={resource.drive_url} target="_blank" rel="noreferrer">Open source file</a> : null}</article>)}</div> : <p className="muted">No course material registered yet.</p>}
      </section>
    </main>
  );
}
