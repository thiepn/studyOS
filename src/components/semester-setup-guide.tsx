import Link from "next/link";
import type {SemesterBootstrapEvaluation} from "@/lib/study/semester-bootstrap";
import {courseSetupSummary,nextCourseSetupAction,SEMESTER_STAGES} from "@/lib/study/semester-management";

export function SemesterSetupGuide({evaluation}:{evaluation:SemesterBootstrapEvaluation}){
  const summary=courseSetupSummary(evaluation);
  const active=summary.stage==="certified"?null:SEMESTER_STAGES.findIndex(s=>s.id===summary.stage);
  return <section className="semester-setup-guide" aria-labelledby="semester-setup-guide-heading">
    <div className="semester-setup-guide-heading">
      <div><span className="section-kicker">Current semester · evidence checklist</span>
        <h2 id="semester-setup-guide-heading">{evaluation.certified?"Workspace formally confirmed":"Finish setup in evidence order"}</h2></div>
      <span>{summary.complete}/{summary.total} courses ready</span>
    </div>
    <p>Readiness is calculated from current records. These steps do not mark courses verified or certify the semester.</p>
    <ol className="semester-setup-steps">
      {SEMESTER_STAGES.map((step,i)=>{
        const done=evaluation.certified||active!=null&&i<active;
        const current=!evaluation.certified&&active===i;
        return <li key={step.id} className={current?"current":done?"complete":"pending"} aria-current={current?"step":undefined}>
          <span className="semester-setup-step-number" aria-hidden="true">{String(i+1).padStart(2,"0")}</span>
          <div><strong>{step.name}</strong><small>{step.description}</small></div>
          <span className="semester-setup-step-state">{done?"Passed":current?"Next action":"Pending"}</span>
        </li>;
      })}
    </ol>
    {summary.uncertified?<p className="semester-setup-action-note">The evidence checks pass, but certification is still pending. The final confirmation control below must be used explicitly.</p>:null}
    {summary.missing.length?<div className="semester-setup-unresolved"><h3>Courses needing attention</h3>
      <ul>{summary.missing.map(c=>{const action=nextCourseSetupAction(c);return <li key={c.courseId}><div><strong>{c.displayName}</strong><small>{action.detail}</small></div><Link href={action.href}>{action.label} →</Link></li>;})}</ul>
    </div>:null}
  </section>;
}
