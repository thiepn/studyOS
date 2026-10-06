import Link from "next/link";
import { Nav } from "@/components/nav";
import { getWeeklyCalibrationProfile } from "@/lib/study/weekly-calibration-data";

export const dynamic="force-dynamic";

function fmt(min:number){
  const n=Math.max(0,Math.round(min));
  const h=Math.floor(n/60),m=n%60;
  return h?(m?h+"h "+m+"m":h+"h"):m+"m";
}
function pct(value:number|null){return value==null?"—":value+"%";}
function signed(min:number){return min>0?"+"+min:String(min);}

export default async function QualityPage(){
  const data=await getWeeklyCalibrationProfile();
  const profile=data.profile;
  const adjusted=profile.courses.filter(course=>course.adjustmentApplied);

  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">P20 · execution quality</p><h1>Planning calibration</h1></div>
      <Nav />
    </header>

    <section className={"panel quality-hero evidence-"+profile.evidence}>
      <div className="section-heading">
        <div><p className="eyebrow">Completed weekly commitments</p><h2>{profile.completedWeeks} week{profile.completedWeeks===1?"":"s"} of evidence</h2></div>
        <span>{profile.evidence}</span>
      </div>
      <div className="quality-summary-grid">
        <span><strong>{pct(profile.medianWeekAdherencePercent)}</strong> median course-budget adherence</span>
        <span><strong>{profile.capacitySignal.replaceAll("_"," ")}</strong> capacity signal</span>
        <span><strong>{profile.totalRebalancedWeeks}</strong> rebalanced weeks</span>
        <span><strong>{profile.totalSacrificeEvents}</strong> sacrifice events</span>
      </div>
      <p>{profile.capacityRecommendation}</p>
      <small>P20 does not automatically change P10 daily capacity. The capacity recommendation is advisory because mandatory work and retention are not measured as course-envelope minutes.</small>
    </section>

    {profile.completedWeeks<3?<section className="panel quality-gate">
      <p className="eyebrow">Calibration gate</p>
      <h2>No automatic floor correction yet</h2>
      <p>StudyOS requires at least three completed P19 weekly commitments before changing any P18 course protection floor. Current P18/P19 behavior therefore remains on the original heuristics.</p>
      <div className="button-row"><Link className="primary-button" href="/week">Open weekly commitment</Link><Link className="secondary-button" href="/scenarios">Open scenarios</Link></div>
    </section>:null}

    <section className="quality-course-grid">
      {profile.courses.length?profile.courses.map(course=><article className={"panel quality-course signal-"+course.allocationSignal} key={course.courseId}>
        <div className="quality-course-head">
          <div><p className="eyebrow">{course.allocationSignal.replaceAll("_"," ")}</p><h2>{course.shortName??course.displayName}</h2></div>
          <strong className={course.floorAdjustmentMinutes>0?"quality-adjust-up":course.floorAdjustmentMinutes<0?"quality-adjust-down":""}>
            {course.floorAdjustmentMinutes===0?"0":signed(course.floorAdjustmentMinutes)} min
          </strong>
        </div>
        <div className="quality-course-metrics">
          <span><strong>{course.observedWeeks}</strong> observed weeks</span>
          <span><strong>{pct(course.medianAdherencePercent)}</strong> median final-target adherence</span>
          <span><strong>{course.sacrificedWeeks}</strong> sacrificed weeks</span>
          <span><strong>{course.rebalancedWeeks}</strong> rebalanced weeks</span>
        </div>
        <p>{course.rationale}</p>
        <div className="quality-course-metrics">
          <span><strong>{course.overallocatedWeeks}</strong> overallocated signals</span>
          <span><strong>{course.underallocatedWeeks}</strong> underallocated signals</span>
          <span><strong>{course.estimateSamples}</strong> estimate pairs</span>
          <span><strong>{course.medianEstimateRatio==null?"—":course.medianEstimateRatio.toFixed(2)+"×"}</strong> actual / planned</span>
        </div>
        <small>Estimate signal: {course.estimateSignal.replaceAll("_"," ")}. {course.adjustmentApplied
          ?"This bounded floor correction is now applied to future P18/P19 scenarios."
          :"No automatic floor correction is currently supported."}</small>
      </article>):<section className="panel quality-empty">
        <h2>No completed-week evidence yet</h2>
        <p>P20 will populate after P19 weekly commitments reach their Sunday endpoint. Current weeks are intentionally excluded from calibration so partial execution cannot distort future floors.</p>
      </section>}
    </section>

    <section className="panel">
      <div className="section-heading">
        <div><p className="eyebrow">Calibration feedback</p><h2>{adjusted.length} active floor correction{adjusted.length===1?"":"s"}</h2></div>
        <span>±30 min max</span>
      </div>
      {adjusted.length?<div className="quality-adjustments">{adjusted.map(course=><div key={course.courseId}>
        <strong>{course.shortName??course.displayName}</strong>
        <span>{signed(course.floorAdjustmentMinutes)} min</span>
      </div>)}</div>:<p>No course currently has enough stable evidence for a protection-floor change.</p>}
      <p className="muted">P20 calibrates only protection floors. It does not modify P17 readiness, P9 exam strategy, the P18 diminishing-return penalty, or the P10 daily capacity setting.</p>
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Completed-week history</p><h2>Adherence over time</h2></div><span>{profile.weeks.length}</span></div>
      {profile.weeks.length?<div className="quality-history-wrap"><table className="quality-history">
        <thead><tr><th>Week ending</th><th>Target</th><th>Credited</th><th>Adherence</th><th>Rebalanced</th><th>Sacrifices</th></tr></thead>
        <tbody>{profile.weeks.map(week=><tr key={week.planId}>
          <td>{week.periodEndsOn}</td>
          <td>{fmt(week.targetMinutes)}</td>
          <td>{fmt(week.creditedMinutes)}</td>
          <td>{week.adherencePercent}%</td>
          <td>{week.rebalanced?"Yes":"No"}</td>
          <td>{week.sacrificedCourses}</td>
        </tr>)}</tbody>
      </table></div>:<p className="muted">No completed P19 weekly commitment exists yet.</p>}
    </section>

    <section className="panel quality-method">
      <p className="eyebrow">Interpretation guardrails</p>
      <h2>What P20 can and cannot infer</h2>
      <p>A missed course target is only called course-specific overallocation when the week as a whole was executed at least reasonably well. If the entire week collapsed, P20 treats that as a capacity/execution problem instead of lowering that course's floor.</p>
      <p>Repeated extra work, repeated sacrifice, and sustained estimate under-runs can raise protection. A weak-readiness course is never given a lower floor merely because its target was missed.</p>
    </section>
  </main>;
}
