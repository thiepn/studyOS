"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { ReconciliationFinding, SkillOption, WeekActionRow, WeekResource } from "@/lib/study/workflow";
import { actionDescription, actionLabel, milestoneForAction } from "@/lib/study/workflow-state";
import { featuredTeachingWeek, orderedTeachingWeeks } from "@/lib/study/week-focus";

const ERROR_OPTIONS = [
  ["concept","Concept"],["recall","Recall"],["recognition","Recognition"],["method_selection","Method choice"],
  ["execution","Execution"],["proof_structure","Proof structure"],["calculation","Calculation"],
  ["misreading","Misread"],["time_management","Time"],["programming_bug","Programming bug"],
] as const;

function resourceLabel(type: string) {
  if (type === "lecture") return "Lecture";
  if (type === "exercise") return "Exercise";
  if (type === "solution") return "Solution";
  return type.replaceAll("_", " ");
}

export function WeekWorkflowPanel({
  courseId, weeks, findings, skills, resources,
}: {
  courseId: string;
  weeks: WeekActionRow[];
  findings: ReconciliationFinding[];
  skills: SkillOption[];
  resources: WeekResource[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [collapsedFeatured,setCollapsedFeatured]=useState<string[]>([]);
  const [expandedOther,setExpandedOther]=useState<string[]>([]);
  const featuredId=featuredTeachingWeek(weeks);
  const orderedWeeks=orderedTeachingWeeks(weeks);
  const findingsByWeek = useMemo(() => {
    const map = new Map<string, ReconciliationFinding[]>();
    for (const finding of findings) {
      const list = map.get(finding.teaching_week_id) ?? [];
      list.push(finding); map.set(finding.teaching_week_id, list);
    }
    return map;
  }, [findings]);
  const resourcesByWeek = useMemo(() => {
    const map = new Map<string, WeekResource[]>();
    for (const resource of resources) {
      if (!resource.teaching_week_id) continue;
      const list = map.get(resource.teaching_week_id) ?? [];
      list.push(resource); map.set(resource.teaching_week_id, list);
    }
    return map;
  }, [resources]);

  async function post(path: string, body: unknown, key: string) {
    setBusy(key); setMessage(null);
    try {
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Action failed");
      router.refresh();
      setMessage("Saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function submitFinding(event: FormEvent<HTMLFormElement>, week: WeekActionRow) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await post(`/api/study/courses/${courseId}/findings`, {
      weekNo: week.week_no,
      title: fd.get("title"),
      detail: fd.get("detail"),
      errorType: fd.get("errorType"),
      severity: fd.get("severity"),
      skillId: fd.get("skillId"),
    }, `finding-${week.teaching_week_id}`);
    event.currentTarget.reset();
  }

  if (!weeks.length) {
    return <section className="panel empty-week"><h2>No teaching week yet</h2><p>Once a lecture, exercise sheet, or other week-numbered source is registered, its weekly workflow appears here automatically.</p></section>;
  }

  return (
    <div className="week-stack">
      {orderedWeeks.map((week) => {
        const milestone = milestoneForAction(week.next_action);
        const weekFindings = findingsByWeek.get(week.teaching_week_id) ?? [];
        const weekResources = resourcesByWeek.get(week.teaching_week_id) ?? [];
        const isFeatured=week.teaching_week_id===featuredId;
        const isExpanded=isFeatured?!collapsedFeatured.includes(week.teaching_week_id):expandedOther.includes(week.teaching_week_id);
        return (
          <div className={"week-work-item "+(isFeatured?"week-work-featured":"")} key={week.teaching_week_id}>
            <button type="button" className="week-work-toggle" aria-expanded={isExpanded}
              onClick={()=>{
                if(isFeatured)setCollapsedFeatured(current=>current.includes(week.teaching_week_id)?current.filter(id=>id!==week.teaching_week_id):[...current,week.teaching_week_id]);
                else setExpandedOther(current=>current.includes(week.teaching_week_id)?current.filter(id=>id!==week.teaching_week_id):[...current,week.teaching_week_id]);
              }}>
              <span className="week-work-number">W{String(week.week_no).padStart(2,"0")}</span>
              <span className="week-work-title"><strong>{actionLabel(week.next_action)}</strong><small>{week.health_status.replaceAll("_"," ")} · {week.due_skills} due · {week.open_findings} findings</small></span>
              {isFeatured?<span className="week-work-now">Next</span>:null}
              <span aria-hidden="true" className="week-work-chevron">{isExpanded?"−":"+"}</span>
            </button>
            {isExpanded?<section id={"week-panel-"+week.teaching_week_id} className="panel week-card">
            <div className="week-card-head">
              <div><p className="eyebrow">Teaching week {week.week_no}</p><h2>{actionLabel(week.next_action)}</h2></div>
              <span className={`health-badge health-${week.health_status}`}>{week.health_status.replaceAll("_", " ")}</span>
            </div>
            <p className="workflow-description">{actionDescription(week.next_action)}</p>

            <div className="week-metrics">
              <span>{week.lecture_count} lectures</span>
              <span>{week.exercise_count} exercises</span>
              <span>{week.solution_count} solutions</span>
              <span>{week.skill_count} skills</span>
              <span>{week.due_skills} due</span>
              <span>{week.open_findings} findings</span>
            </div>

            {weekResources.length ? (
              <div className="resource-links">
                {weekResources.map((resource) => resource.drive_url
                  ? <a key={resource.id} href={resource.drive_url} target="_blank" rel="noreferrer">{resourceLabel(resource.resource_type)} · {resource.title}</a>
                  : <span key={resource.id}>{resourceLabel(resource.resource_type)} · {resource.title}</span>)}
              </div>
            ) : null}

            <div className="button-row">
              {week.next_action === "process_material" ? <a className="primary-button" href="/resources">Open Resources</a> : null}
              {week.next_action === "repair_findings" ? <a className="primary-button" href="/practice">Open repair review</a> : null}
              {week.next_action === "weekly_checkpoint" ? <a className="secondary-button" href="/practice">Run mixed review first</a> : null}
              {milestone ? (
                <button
                  className="primary-button button-reset"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void post(`/api/study/courses/${courseId}/milestone`, {
                    weekNo: week.week_no,
                    milestone,
                    note: milestone === "exercise_attempt" ? "Independent sheet attempt completed before solution review." : undefined,
                  }, `milestone-${week.teaching_week_id}`)}
                >
                  {busy === `milestone-${week.teaching_week_id}` ? "Saving…" :
                    milestone === "lecture_retrieval" ? "Mark retrieval complete" :
                    milestone === "exercise_attempt" ? "Mark independent attempt complete" :
                    milestone === "solution_reconcile" ? "Mark reconciliation complete" :
                    "Mark checkpoint complete"}
                </button>
              ) : null}
            </div>

            {(week.solution_count > 0 || weekFindings.length > 0) ? (
              <div className="reconcile-block">
                <h3>Solution findings</h3>
                {weekFindings.length ? <div className="finding-list">{weekFindings.map((finding) => (
                  <article key={finding.id}>
                    <div><strong>{finding.title}</strong><span>{finding.skill_id ? "repair scheduled" : "unmapped"}</span></div>
                    {finding.detail ? <p>{finding.detail}</p> : null}
                    <div className="button-row">
                      {finding.skill_id ? <a className="secondary-button" href="/practice">Practice repair</a> : null}
                      <button className="secondary-button button-reset" disabled={Boolean(busy)} type="button" onClick={() => void post(`/api/study/findings/${finding.id}/resolve`, { note: "Resolved after independent repair." }, `resolve-${finding.id}`)}>Resolve</button>
                    </div>
                  </article>
                ))}</div> : <p className="muted">No discrepancy recorded.</p>}

                <form className="finding-form" onSubmit={(event) => void submitFinding(event, week)}>
                  <div className="form-grid">
                    <label className="wide"><span>Finding</span><input name="title" required maxLength={240} placeholder="e.g. Chose substitution when integration by parts was required" /></label>
                    <label className="wide"><span>What went wrong?</span><textarea name="detail" rows={3} placeholder="Short diagnostic note, not a copied solution." /></label>
                    <label><span>Error type</span><select name="errorType" defaultValue="method_selection">{ERROR_OPTIONS.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                    <label><span>Severity</span><select name="severity" defaultValue="2"><option value="1">1 · minor</option><option value="2">2 · meaningful</option><option value="3">3 · major</option></select></label>
                    <label className="wide"><span>Map to skill <em>optional</em></span><select name="skillId" defaultValue=""><option value="">Keep unmapped</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.title}</option>)}</select></label>
                  </div>
                  <div className="button-row"><button className="secondary-button button-reset" type="submit" disabled={Boolean(busy)}>{busy === `finding-${week.teaching_week_id}` ? "Adding…" : "Add finding"}</button></div>
                </form>
              </div>
            ) : null}
            </section>:null}
          </div>
        );
      })}
      {message ? <p className="form-message" role="status">{message}</p> : null}
    </div>
  );
}
