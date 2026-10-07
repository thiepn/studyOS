import Link from "next/link";
import { Nav } from "@/components/nav";
import { getSemesterCompletionData } from "@/lib/study/semester-completion-data";

export const dynamic="force-dynamic";

function pretty(value:string|null|undefined){return value?value.replaceAll("_"," "):"—";}
function fmtCredits(value:number){return Number.isInteger(value)?String(value):value.toFixed(1);}
function fmtDate(iso:string|null,timezone:string){
  if(!iso)return "—";
  return new Date(iso).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:timezone});
}
function resultLabel(row:any){
  if(!row)return "No official result";
  const mark=row.gradeText?" · "+row.gradeText:row.scorePercent!=null?" · "+row.scorePercent+"%":"";
  return pretty(row.outcome)+mark;
}
function stateExplanation(state:string){
  return ({
    passed:"Official pass recorded. Course is complete.",
    retake_planned:"Official non-pass recorded; a future retake is scheduled.",
    retake_pending:"Official non-pass recorded; retake decision is unresolved.",
    closed_without_pass:"Course is closed without a passing result.",
    provisional_result:"A newer attempt has a provisional result and is waiting for official confirmation.",
    awaiting_result:"The configured exam has ended and the current attempt has no result yet.",
    ongoing:"Course is still active and has no terminal official outcome.",
    inactive_unresolved:"Course is inactive without a terminal official result. Review the data before treating the semester as complete.",
  } as Record<string,string>)[state]??state;
}

export default async function SemesterPage(){
  const data=await getSemesterCompletionData();
  const {summary,retrospective}=data;
  const completionPct=summary.totalCourses?Math.round(summary.terminalCourses/summary.totalCourses*100):0;
  const creditPct=summary.passCreditPercent??0;

  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">Semester review</p><h1>{data.semester.displayName}</h1></div>
      <Nav />
    </header>

    <section className={"panel semester-ledger-hero review-"+retrospective.status}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Academic outcome state</p>
          <h2>{pretty(retrospective.status)}</h2>
        </div>
        <span>{summary.passedCourses}/{summary.totalCourses} passed</span>
      </div>
      <p>{retrospective.summary}</p>
      <div className="semester-ledger-bars">
        <div>
          <div><strong>{summary.terminalCourses}/{summary.totalCourses}</strong><span>terminal course outcomes</span></div>
          <div className="bar"><i style={{width:completionPct+"%"}}/></div>
        </div>
        <div>
          <div><strong>{fmtCredits(summary.passedCredits)} / {fmtCredits(summary.configuredCredits)} credits</strong><span>officially passed</span></div>
          <div className="bar"><i style={{width:creditPct+"%"}}/></div>
        </div>
      </div>
      {!summary.outcomeCreditCoverageComplete?<p className="scenario-warning"><strong>Credit coverage is partial.</strong> {summary.unknownCreditCourses} course{summary.unknownCreditCourses===1?" has":"s have"} no configured credit value, so the credit percentage excludes unknown credits from its denominator.</p>:null}
    </section>

    <section className="panel semester-credit-summary">
      <div className="section-heading">
        <div><p className="eyebrow">Credit / pass progress</p><h2>Where the semester stands</h2></div>
        <span>{summary.passCreditPercent==null?"—":summary.passCreditPercent+"%"}</span>
      </div>
      <div className="semester-credit-grid">
        <span><strong>{fmtCredits(summary.passedCredits)}</strong> passed credits</span>
        <span><strong>{fmtCredits(summary.retakeCredits)}</strong> planned-retake credits</span>
        <span><strong>{fmtCredits(summary.unresolvedCredits)}</strong> unresolved / active credits</span>
        <span><strong>{fmtCredits(summary.closedWithoutPassCredits)}</strong> closed without pass</span>
        <span><strong>{summary.officialAttempts}</strong> official attempts</span>
        <span><strong>{summary.nonPassingAttempts}</strong> non-passing attempts</span>
        <span><strong>{summary.firstAttemptPasses}</strong> first-attempt passes</span>
        <span><strong>{summary.eventualRetakePasses}</strong> later-attempt passes</span>
      </div>
    </section>

    <section className="semester-course-ledger">
      {data.courses.map(course=><article className={"panel semester-course-row state-"+course.completionState} key={course.courseId}>
        <div className="semester-course-head">
          <div>
            <p className="eyebrow">{pretty(course.courseKind)} · {course.credits==null?"credits unknown":fmtCredits(course.credits)+" credits"}</p>
            <h2>{course.displayName}</h2>
          </div>
          <span>{pretty(course.completionState)}</span>
        </div>
        <p>{stateExplanation(course.completionState)}</p>
        <div className="semester-course-metrics">
          <span><strong>{course.officialAttempts}</strong> official attempts</span>
          <span><strong>{course.nonPassingAttempts}</strong> non-passing</span>
          <span><strong>{course.passedAttemptNo??"—"}</strong> passing attempt</span>
          <span><strong>{course.latestOfficial?resultLabel(course.latestOfficial):"—"}</strong> latest official</span>
        </div>
        {course.currentExamAt||course.nextExamAt?<p className="muted">{course.nextExamAt
          ?"Next exam: "+fmtDate(course.nextExamAt,data.timezone)
          :"Configured exam: "+fmtDate(course.currentExamAt,data.timezone)}</p>:null}

        {course.attempts.length?<details className="semester-attempt-history">
          <summary>Attempt history · {course.attempts.length}</summary>
          <div>
            {course.attempts.map(attempt=><article key={attempt.id}>
              <div><strong>Attempt {attempt.attemptNo} · {pretty(attempt.outcome)}</strong><span>{pretty(attempt.resultStatus)}</span></div>
              <small>{fmtDate(attempt.examAt,data.timezone)}{attempt.gradeText?" · "+attempt.gradeText:attempt.scorePercent!=null?" · "+attempt.scorePercent+"%":""} · readiness {attempt.readinessIndexSnapshot==null?"—":attempt.readinessIndexSnapshot+"/100"} {attempt.readinessBandSnapshot?"("+pretty(attempt.readinessBandSnapshot)+")":""}</small>
            </article>)}
          </div>
        </details>:null}
      </article>)}
    </section>

    <section className="panel semester-outcome-review">
      <div className="section-heading">
        <div><p className="eyebrow">Readiness ↔ outcome review</p><h2>What the readiness evidence got directionally right</h2></div>
        <span>{retrospective.forecastReview.evaluatedAttempts} evaluated</span>
      </div>
      <p>{retrospective.forecastReview.summary}</p>
      <p className="forecast-disclaimer">This is not predictive accuracy. Readiness is an evidence-based index, not a grade forecast or pass probability, so this review measures only broad directional consistency.</p>
      <div className="semester-review-grid">
        <span><strong>{retrospective.forecastReview.aligned}</strong> aligned</span>
        <span><strong>{retrospective.forecastReview.positiveSurprises}</strong> positive surprises</span>
        <span><strong>{retrospective.forecastReview.negativeSurprises}</strong> negative surprises</span>
        <span><strong>{retrospective.forecastReview.mixed}</strong> mixed</span>
        <span><strong>{retrospective.forecastReview.insufficientEvidence}</strong> insufficient evidence</span>
        <span><strong>{retrospective.forecastReview.alignmentRate==null?"—":retrospective.forecastReview.alignmentRate+"%"}</strong> strict alignment rate</span>
      </div>
    </section>

    <section className="panel semester-execution-review">
      <div className="section-heading">
        <div><p className="eyebrow">Weekly execution review</p><h2>{pretty(retrospective.execution.capacitySignal)}</h2></div>
        <span>{retrospective.execution.completedWeeks} completed weeks</span>
      </div>
      <p>{retrospective.execution.summary}</p>
      <div className="semester-review-grid">
        <span><strong>{retrospective.execution.medianWeekAdherencePercent==null?"—":retrospective.execution.medianWeekAdherencePercent+"%"}</strong> median adherence</span>
        <span><strong>{pretty(retrospective.execution.evidence)}</strong> calibration evidence</span>
        <span><strong>{retrospective.execution.rebalancedWeeks}</strong> rebalanced weeks</span>
        <span><strong>{retrospective.execution.sacrificeEvents}</strong> protection sacrifices</span>
      </div>
      {data.calibration.courses.length?<div className="semester-calibration-list">
        {data.calibration.courses.map(course=><article key={course.courseId}>
          <div><strong>{course.shortName??course.displayName}</strong><span>{pretty(course.allocationSignal)}</span></div>
          <small>{course.observedWeeks} observed weeks · {course.medianAdherencePercent??"—"}% median adherence · floor calibration {course.floorAdjustmentMinutes>0?"+":""}{course.floorAdjustmentMinutes} min</small>
        </article>)}
      </div>:<p className="muted">No completed weeks are available for course-level execution review yet.</p>}
    </section>

    <section className="semester-retrospective-grid">
      <article className="panel">
        <p className="eyebrow">Supported strengths</p>
        <h2>What worked</h2>
        {retrospective.strengths.length?<ul>{retrospective.strengths.map(item=><li key={item}>{item}</li>)}</ul>:<p className="muted">No semester-level strength is established strongly enough yet.</p>}
      </article>
      <article className="panel">
        <p className="eyebrow">Open concerns</p>
        <h2>What needs attention</h2>
        {retrospective.concerns.length?<ul>{retrospective.concerns.map(item=><li key={item}>{item}</li>)}</ul>:<p className="muted">No unresolved semester-level concern is currently supported.</p>}
      </article>
    </section>

    <section className="panel semester-next-actions">
      <div className="section-heading"><div><p className="eyebrow">Next-semester handoff</p><h2>Evidence-backed changes</h2></div><span>{retrospective.nextSemesterActions.length}</span></div>
      <ol>{retrospective.nextSemesterActions.map(item=><li key={item}>{item}</li>)}</ol>
      <div className="button-row">
        <Link className="secondary-button" href="/semester/bootstrap">Semester setup</Link><Link className="secondary-button" href="/exam-results">Open exam results</Link>
        <Link className="secondary-button" href="/quality">Inspect execution quality</Link>
        <Link className="secondary-button" href="/outlook">Review readiness model</Link>
        <Link className="secondary-button" href="/semesters">Semester history</Link>
        <Link className="secondary-button" href="/semester/rollover">Rollover semester</Link>
      </div>
    </section>
  </main>;
}
