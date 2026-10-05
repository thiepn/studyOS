import Link from "next/link";
import { Nav } from "@/components/nav";
import { getSemesterPulse, topRiskDrivers } from "@/lib/study/pulse";
import { getSemesterCalibration } from "@/lib/study/calibration-data";
import { getSemesterDrift } from "@/lib/study/drift-data";

export const dynamic = "force-dynamic";

export default async function ProgressPage(){
  const [pulse,calibration,drift]=await Promise.all([getSemesterPulse(),getSemesterCalibration(),getSemesterDrift()]);
  const calibrationByCourse=new Map(calibration.map((item)=>[item.courseId,item.profile]));
  const driftByCourse=new Map(drift.courses.map((item)=>[item.courseId,item.profile]));
  const sustainedDrift=drift.courses.filter((item)=>item.profile.band==="drifting"||item.profile.band==="critical").length;
  return <main className="shell">
    <header className="header"><div><p className="eyebrow">Longitudinal diagnostics</p><h1>Progress</h1></div><Nav /></header>

    <section className="panel progress-summary">
      <div className="section-heading"><div><p className="eyebrow">Semester health</p><h2>Where retention is failing</h2></div><span>{pulse.risks.filter((c)=>c.risk_band==="at_risk"||c.risk_band==="critical").length}</span></div>
      <p className="muted">Risk is deterministic: retention pressure + overdue reviews + recent lapses + actionable coursework backlog + unresolved errors + exam-readiness gap. P14 separately checks completed-week performance and workload drift; {sustainedDrift} course{sustainedDrift===1?" is":"s are"} currently in sustained drift.</p>
    </section>

    <section className="risk-course-list">
      {pulse.risks.map((course)=>{
        const drivers=topRiskDrivers(course,3);
        const mix=course.recommended_mix && typeof course.recommended_mix==="object" ? Object.entries(course.recommended_mix) : [];
        const calibrationProfile=calibrationByCourse.get(course.course_id);
        const driftProfile=driftByCourse.get(course.course_id);
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

          {calibrationProfile ? <div className="course-calibration-strip">
            <div><span>Calibration</span><strong>{calibrationProfile.status}</strong></div>
            <div><span>Independent sample</span><strong>{calibrationProfile.independentAttempts} · {calibrationProfile.distinctSkills} skills</strong></div>
            <div><span>Accuracy</span><strong>{calibrationProfile.accuracyPercent==null?"—":calibrationProfile.accuracyPercent+"%"}</strong></div>
            <div><span>Confidence gap</span><strong>{calibrationProfile.confidenceGap==null?"—":(calibrationProfile.confidenceGap>0?"+":"")+calibrationProfile.confidenceGap+"%"}</strong></div>
            <div><span>Pace</span><strong>{calibrationProfile.paceRatio==null?"—":calibrationProfile.paceRatio.toFixed(2)+"×"}</strong></div>
            <div><span>Weak signal</span><strong>{calibrationProfile.weakDimension?.replaceAll("_"," ") ?? calibrationProfile.dominantError?.replaceAll("_"," ") ?? "not stable yet"}</strong></div>
          </div> : null}

          {driftProfile ? <div className={"course-drift-panel drift-"+driftProfile.band}>
            <div className="course-drift-head"><div><span>Multi-week drift</span><strong>{driftProfile.band.replace("_"," ")}</strong></div><b>{driftProfile.sufficientData?driftProfile.score+"/100":"collecting evidence"}</b></div>
            <div className="course-drift-metrics">
              <span><strong>{driftProfile.recentAccuracyPercent==null?"—":driftProfile.recentAccuracyPercent+"%"}</strong> recent accuracy</span>
              <span><strong>{driftProfile.accuracyDelta==null?"—":(driftProfile.accuracyDelta>0?"+":"")+driftProfile.accuracyDelta+" pp"}</strong> vs prior</span>
              <span><strong>{driftProfile.recentPracticeMinutes} / {driftProfile.priorPracticeMinutes} min</strong> practice</span>
              <span><strong>{driftProfile.workflowLagWeeks}</strong> lagged weeks</span>
              <span><strong>{driftProfile.unresolvedErrors}</strong> unresolved errors</span>
              <span><strong>{driftProfile.workloadFeedback.replace("_"," ")}</strong> workload/result</span>
            </div>
            {driftProfile.components.length?<ul>{driftProfile.components.slice(0,3).map((component)=><li key={component.key}>{component.label} <strong>+{component.points}</strong></li>)}</ul>:null}
            <p>{driftProfile.recommendation}</p>
          </div> : null}

          <div className="risk-detail-grid">
            <div><h3>Risk drivers</h3>{drivers.length?<ul>{drivers.map((driver)=><li key={driver.key}><span>{driver.label}</span><strong>{driver.value.toFixed(1)}</strong></li>)}</ul>:<p className="muted">No material risk signal yet.</p>}</div>
            <div><h3>Operating mix</h3><ul>{mix.map(([key,value])=><li key={key}><span>{key.replaceAll("_"," ")}</span><strong>{Number(value)}%</strong></li>)}</ul></div>
          </div>

          {calibrationProfile ? <p className="calibration-recommendation"><strong>Calibration:</strong> {calibrationProfile.recommendation}</p> : null}
          <p className="muted">{course.days_to_exam==null?"Exam date not configured.":course.days_to_exam>=0?String(course.days_to_exam)+" days to exam.":"Exam date has passed."} {course.actionable_backlog} actionable weekly item{course.actionable_backlog===1?"":"s"} · {course.unresolved_errors} unresolved error{course.unresolved_errors===1?"":"s"}.</p>
          <div className="button-row"><Link className="secondary-button" href={"/courses/" + course.course_id}>Open course</Link>{calibrationProfile?<Link className="secondary-button" href={"/practice?mode=calibration&course="+course.course_id}>Calibration set</Link>:null}</div>
        </article>;
      })}
    </section>
  </main>;
}
