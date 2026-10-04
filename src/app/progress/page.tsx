import Link from "next/link";
import { Nav } from "@/components/nav";
import { getSemesterPulse, topRiskDrivers } from "@/lib/study/pulse";

export const dynamic = "force-dynamic";

export default async function ProgressPage(){
  const pulse=await getSemesterPulse();
  return <main className="shell">
    <header className="header"><div><p className="eyebrow">Longitudinal diagnostics</p><h1>Progress</h1></div><Nav /></header>

    <section className="panel progress-summary">
      <div className="section-heading"><div><p className="eyebrow">Semester health</p><h2>Where retention is failing</h2></div><span>{pulse.risks.filter((c)=>c.risk_band==="at_risk"||c.risk_band==="critical").length}</span></div>
      <p className="muted">Risk is deterministic: retention pressure + overdue reviews + recent lapses + actionable coursework backlog + unresolved errors + exam-readiness gap. Low coverage alone does not make an early-semester course “dangerous.”</p>
    </section>

    <section className="risk-course-list">
      {pulse.risks.map((course)=>{
        const drivers=topRiskDrivers(course,3);
        const mix=course.recommended_mix && typeof course.recommended_mix==="object" ? Object.entries(course.recommended_mix) : [];
        return <article className="panel risk-course" key={course.course_id}>
          <div className="risk-course-head">
            <div><p className="eyebrow">{course.operating_mode.replace("_"," ")} mode</p><h2>{course.display_name}</h2></div>
            <div className="risk-score-block"><span className={"risk-badge risk-" + course.risk_band}>{course.risk_band.replace("_"," ")}</span><strong>{Math.round(Number(course.risk_score))}/100</strong></div>
          </div>

          <div className="diagnostic-grid">
            <div><strong>{course.tested_skills}</strong><span>tested skills</span></div>
            <div><strong>{course.due_or_at_risk_skills}</strong><span>due / at risk</span></div>
            <div><strong>{course.overdue_7d_skills}</strong><span>7d+ overdue</span></div>
            <div><strong>{course.relearning_skills}</strong><span>relearning</span></div>
            <div><strong>{course.recent_lapse_skills}</strong><span>recent lapses</span></div>
            <div><strong>{Math.round(Number(course.exam_ready_percent))}%</strong><span>exam-ready</span></div>
          </div>

          <div className="risk-detail-grid">
            <div><h3>Risk drivers</h3>{drivers.length?<ul>{drivers.map((driver)=><li key={driver.key}><span>{driver.label}</span><strong>{driver.value.toFixed(1)}</strong></li>)}</ul>:<p className="muted">No material risk signal yet.</p>}</div>
            <div><h3>Operating mix</h3><ul>{mix.map(([key,value])=><li key={key}><span>{key.replaceAll("_"," ")}</span><strong>{Number(value)}%</strong></li>)}</ul></div>
          </div>

          <p className="muted">{course.days_to_exam==null?"Exam date not configured.":course.days_to_exam>=0?String(course.days_to_exam)+" days to exam.":"Exam date has passed."} {course.actionable_backlog} actionable weekly item{course.actionable_backlog===1?"":"s"} · {course.unresolved_errors} unresolved error{course.unresolved_errors===1?"":"s"}.</p>
          <div className="button-row"><Link className="secondary-button" href={"/courses/" + course.course_id}>Open course</Link></div>
        </article>;
      })}
    </section>
  </main>;
}
