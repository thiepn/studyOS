"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ReconciliationFinding, SkillOption, WeekActionRow, WeekResource } from "@/lib/study/workflow";
import { actionDescription, actionLabel, milestoneForAction } from "@/lib/study/workflow-state";
import { featuredTeachingWeek, orderedTeachingWeeks } from "@/lib/study/week-focus";
import { canOpenWeekSolutions } from "@/lib/study/course-study-flow";

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
  const [messageTarget,setMessageTarget]=useState<string | null>(null);
  const [collapsedFeatured,setCollapsedFeatured]=useState<string[]>([]);
  const [expandedOther,setExpandedOther]=useState<string[]>([]);
  const [independentConfirmed,setIndependentConfirmed]=useState<string[]>([]);
  const featuredId=featuredTeachingWeek(weeks);
  const orderedWeeks=orderedTeachingWeeks(weeks);
  // Hash links from course practice and deep links must open the intended
  // binder week rather than scrolling to a collapsed inaccessible panel.
  useEffect(()=>{
    const openWeek=()=>{
      const match=/^#week-(\d+)$/.exec(window.location.hash);
      if(!match)return;
      const target=weeks.find(item=>item.week_no===Number(match[1]));
      if(!target)return;
      setCollapsedFeatured(current=>current.filter(id=>id!==target.teaching_week_id));
      setExpandedOther(current=>current.includes(target.teaching_week_id)?current:[...current,target.teaching_week_id]);
      window.requestAnimationFrame(()=>{
        document.getElementById(`week-${target.week_no}`)?.scrollIntoView({block:"start"});
      });
    };
    window.addEventListener("hashchange",openWeek);
    openWeek();
    return ()=>window.removeEventListener("hashchange",openWeek);
  },[weeks]);
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
    setBusy(key); setMessage(null); setMessageTarget(key);
    try {
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Action failed");
      router.refresh();
      setMessage("Saved.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function submitFinding(event: FormEvent<HTMLFormElement>, week: WeekActionRow) {
    event.preventDefault();
    const form=event.currentTarget;
    const fd = new FormData(form);
    const saved=await post(`/api/study/courses/${courseId}/findings`, {
      weekNo: week.week_no,
      title: fd.get("title"),
      detail: fd.get("detail"),
      errorType: fd.get("errorType"),
      severity: fd.get("severity"),
      skillId: fd.get("skillId"),
      exerciseResourceId: fd.get("exerciseResourceId"),
      solutionResourceId: fd.get("solutionResourceId"),
    }, `finding-${week.teaching_week_id}`);
    if(saved)form.reset();
  }

  if (!weeks.length) {
    return <section className="panel empty-week"><h2>No teaching week yet</h2><p>Register your first lecture, exercise sheet or other week-numbered source to create a working week.</p><div className="button-row"><Link href={`/resources?course=${courseId}&week=1#manual-registration`} className="primary-button">Add first source</Link></div></section>;
  }

  return (
    <div className="week-stack">
      {orderedWeeks.map((week) => {
        const milestone = milestoneForAction(week.next_action);
        const weekFindings = findingsByWeek.get(week.teaching_week_id) ?? [];
        const weekResources = resourcesByWeek.get(week.teaching_week_id) ?? [];
        const solutionsVisible=canOpenWeekSolutions(week);
        const hiddenSolutions=weekResources.filter(item=>["solution","exam_solution"].includes(item.resource_type) && !solutionsVisible);
        const visibleResources=weekResources.filter(item=>!hiddenSolutions.includes(item));
        const exerciseConfirmed=independentConfirmed.includes(week.teaching_week_id);
        const localMessage=message && (messageTarget===`milestone-${week.teaching_week_id}` || messageTarget===`finding-${week.teaching_week_id}`
          || weekFindings.some(finding=>messageTarget===`resolve-${finding.id}`));
        const isFeatured=week.teaching_week_id===featuredId;
        const isExpanded=isFeatured?!collapsedFeatured.includes(week.teaching_week_id):expandedOther.includes(week.teaching_week_id);
        return (
          <div id={"week-"+week.week_no} className={"week-work-item "+(isFeatured?"week-work-featured":"")} key={week.teaching_week_id}>
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
            <ol className="week-academic-sequence" aria-label="Teaching week progress">
              {([
                ["Lecture retrieval",week.lecture_retrieval_completed_at],
                ["Independent sheet",week.exercise_attempt_completed_at],
                ["Solution reconciliation",week.solution_reconciled_at],
                ["Cumulative check",week.checkpoint_completed_at],
              ] as const).map(([label,completed],step)=><li key={label} className={completed?"completed":""}>
                <span aria-hidden="true">{completed?"✓":String(step+1).padStart(2,"0")}</span>
                <span>{label}</span>
              </li>)}
            </ol>

            <div className="week-metrics">
              <span>{week.lecture_count} lectures</span>
              <span>{week.exercise_count} exercises</span>
              <span>{week.solution_count} solutions</span>
              <span>{week.skill_count} skills</span>
              <span>{week.due_skills} due</span>
              <span>{week.open_findings} findings</span>
            </div>

            {visibleResources.length ? (
              <div className="resource-links" aria-label="Available source material">
                {visibleResources.map((resource) => resource.drive_url
                  ? <a key={resource.id} href={resource.drive_url} target="_blank" rel="noreferrer">{resourceLabel(resource.resource_type)} · {resource.title}</a>
                  : <span key={resource.id}>{resourceLabel(resource.resource_type)} · {resource.title}</span>)}
              </div>
            ) : null}
            {hiddenSolutions.length ? <p className="solution-access-note" role="note">{hiddenSolutions.length} solution file{hiddenSolutions.length===1?" is":"s are"} intentionally hidden. Record your independent exercise attempt first; opening a solution early undermines the evidence. This hides links in StudyOS, not permissions in Drive.</p> : null}

            <div className="button-row">
              {week.skill_count>0 ? <Link className="secondary-button" href={`/practice?mode=week&course=${courseId}&week=${week.week_no}`}>Practice week {week.week_no} skills</Link> : null}
              {week.next_action === "process_material" ? <Link className="primary-button" href={"/resources?course="+courseId+"#processing-queue"}>Process this course’s material</Link> : null}
              {["await_material","await_exercise","await_solution"].includes(week.next_action) ?
                <Link className="secondary-button" href={`/resources?course=${courseId}&week=${week.week_no}#manual-registration`}>Open week {week.week_no} materials</Link> : null}
              {week.next_action === "repair_findings" ? <Link className="primary-button" href={weekFindings.find(f=>f.skill_id)?`/practice?mode=repair&course=${courseId}&skill=${weekFindings.find(f=>f.skill_id)?.skill_id}&finding=${weekFindings.find(f=>f.skill_id)?.id}`:`/practice?course=${courseId}`}>{weekFindings.some(f=>f.skill_id)?"Repair first mapped mistake":"Review course skills"}</Link> : null}
              {week.next_action === "weekly_checkpoint" ? <Link className="primary-button" href={`/practice?mode=weekly-checkpoint&course=${courseId}&week=${week.week_no}`}>Run week {week.week_no} checkpoint</Link> : null}
              {milestone==="exercise_attempt" ? <label className="independent-confirmation">
                <input type="checkbox" checked={exerciseConfirmed} onChange={event=>setIndependentConfirmed(current=>event.target.checked?[...new Set([...current,week.teaching_week_id])]:current.filter(id=>id!==week.teaching_week_id))} />
                <span>I attempted this sheet independently before consulting its solutions.</span>
              </label> : null}
              {milestone==="weekly_checkpoint" ? <small className="week-evidence-guidance">The checkpoint must be completed and at least one independent attempt saved before it can be marked done. Offline records must sync first.</small> : null}
              {milestone ? (
                <button
                  className="primary-button button-reset"
                  type="button"
                  disabled={Boolean(busy) || (milestone==="exercise_attempt" && !exerciseConfirmed)}
                  onClick={() => void post(`/api/study/courses/${courseId}/milestone`, {
                    weekNo: week.week_no,
                    milestone,
                    note: milestone === "exercise_attempt" ? "Learner confirmed an independent sheet attempt before using solutions." : undefined,
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

            {((week.solution_count > 0 && solutionsVisible) || weekFindings.length > 0) ? (
              <div className="reconcile-block">
                <h3>Solution findings</h3>
                {weekFindings.length ? <div className="finding-list">{weekFindings.map((finding) => (
                  <article key={finding.id}>
                    <div><strong>{finding.title}</strong><span>{finding.status==="repair_scheduled"?"repair scheduled":finding.skill_id?"mapped":"unmapped"}</span></div>
                    {finding.detail ? <p>{finding.detail}</p> : null}
                    {finding.exercise_resource_id||finding.solution_resource_id?<p className="finding-sources">{[finding.exercise_resource_id,finding.solution_resource_id].filter(Boolean).map(id=>{
                      const resource=weekResources.find(item=>item.id===id);
                      if(!resource)return null;
                      const label=resourceLabel(resource.resource_type)+" · "+resource.title;
                      if(["solution","exam_solution"].includes(resource.resource_type)&&!solutionsVisible)return <span key={id}>Solution linked · locked until independent attempt</span>;
                      return resource.drive_url?<a key={id} href={resource.drive_url} rel="noreferrer" target="_blank">{label}</a>:<span key={id}>{label}</span>;
                    })}</p>:null}
                    <div className="button-row">
                      {finding.skill_id ? <Link className="primary-button" href={`/practice?mode=repair&course=${courseId}&skill=${finding.skill_id}&finding=${finding.id}`}>Repair this skill</Link> : <span className="muted tiny">No skill mapped. To close without repair evidence, give a dismissal reason below.</span>}
                      <button className="secondary-button button-reset" disabled={Boolean(busy)||!finding.skill_id} type="button" onClick={() => void post(`/api/study/findings/${finding.id}/resolve`, { note: "Verified independent correct practice on the mapped skill." }, `resolve-${finding.id}`)}>Verify &amp; resolve</button>
                    </div>
                    <details className="finding-dismiss"><summary>Dismiss without repair</summary>
                      <form onSubmit={event=>{
                        event.preventDefault();
                        const form=event.currentTarget;
                        const note=new FormData(form).get("reason");
                        void post(`/api/study/findings/${finding.id}/resolve`,{dismiss:true,note},`resolve-${finding.id}`);
                      }}>
                        <label><span>Reason for dismissal</span><input name="reason" required minLength={10} maxLength={500} placeholder="e.g. Duplicated by the mapped finding above" /></label>
                        <button className="secondary-button button-reset" disabled={Boolean(busy)} type="submit">Dismiss with reason</button>
                      </form>
                    </details>
                  </article>
                ))}</div> : <p className="muted">No discrepancy recorded.</p>}

                <form className="finding-form" onSubmit={(event) => void submitFinding(event, week)}>
                  <div className="form-grid">
                    <label className="wide"><span>Finding</span><input name="title" required maxLength={240} placeholder="e.g. Chose substitution when integration by parts was required" /></label>
                    <label className="wide"><span>What went wrong?</span><textarea name="detail" rows={3} placeholder="Short diagnostic note, not a copied solution." /></label>
                    <label><span>Error type</span><select name="errorType" defaultValue="method_selection">{ERROR_OPTIONS.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                    <label><span>Severity</span><select name="severity" defaultValue="2"><option value="1">1 · minor</option><option value="2">2 · meaningful</option><option value="3">3 · major</option></select></label>
                    <label className="wide"><span>Map to skill <em>required for verifiable repair</em></span><select name="skillId" defaultValue=""><option value="">Not mapped — can only dismiss</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.title}</option>)}</select></label>
                    <label><span>Exercise source <em>optional</em></span><select name="exerciseResourceId" defaultValue=""><option value="">No linked sheet</option>{weekResources.filter(r=>r.resource_type==="exercise").map(resource=><option key={resource.id} value={resource.id}>{resource.title}</option>)}</select></label>
                    <label><span>Official solution <em>optional</em></span><select name="solutionResourceId" defaultValue=""><option value="">No linked solution</option>{weekResources.filter(r=>["solution","exam_solution"].includes(r.resource_type)).map(resource=><option key={resource.id} value={resource.id}>{resource.title}</option>)}</select></label>
                  </div>
                  <div className="button-row"><button className="secondary-button button-reset" type="submit" disabled={Boolean(busy)}>{busy === `finding-${week.teaching_week_id}` ? "Adding…" : "Add finding"}</button></div>
                </form>
              </div>
            ) : null}
              {localMessage ? <p className="form-message" role="status">{message}</p> : null}
            </section>:null}
          </div>
        );
      })}
    </div>
  );
}
