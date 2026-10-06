import Link from "next/link";
import { Nav } from "@/components/nav";
import { HandoffControls } from "@/components/handoff-controls";
import { getWeeklyHandoffData } from "@/lib/study/weekly-handoff-data";

export const dynamic="force-dynamic";

function fmt(min:number){
  const n=Math.max(0,Math.round(min));
  const h=Math.floor(n/60),m=n%60;
  return h?(m?h+"h "+m+"m":h+"h"):m+"m";
}
function signed(value:number|null){
  if(value==null)return "—";
  return value>0?"+"+value:String(value);
}
function dueLabel(iso:string){
  return new Date(iso).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"});
}

export default async function HandoffPage(){
  const data=await getWeeklyHandoffData();
  const review=data.review;
  const prior=data.previousPlan;
  const targetActive=data.targetPlan?.status==="active";
  const adjusted=data.calibration.courses.filter(course=>course.adjustmentApplied);

  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">P21 · closed-loop weekly review</p><h1>Weekly handoff</h1></div>
      <Nav />
    </header>

    <section className="panel handoff-hero">
      <div className="section-heading">
        <div><p className="eyebrow">Next operating week</p><h2>{data.targetStart} → {data.targetEnd}</h2></div>
        <span>{data.commitAllowed?"handoff window":"preview"}</span>
      </div>
      <p>P21 closes the weekly loop without carrying study-time debt forward. The previous envelope is reviewed as evidence; next week is rebuilt from current P17 readiness, P20 calibration, real unresolved commitments, and current calendar capacity.</p>
      <div className="handoff-summary-grid">
        <span><strong>{fmt(data.capacity.feasibleCapacityMinutes)}</strong> feasible ceiling</span>
        <span><strong>{fmt(data.capacity.selectedCapacityMinutes)}</strong> recommended capacity</span>
        <span><strong>{fmt(data.capacity.mandatoryMinutes)}</strong> real commitments</span>
        <span><strong>{fmt(data.capacity.courseBudgetMinutes)}</strong> course budget</span>
      </div>
    </section>

    <section className={"panel handoff-review "+(!prior?"handoff-empty":"")}>
      <div className="section-heading">
        <div><p className="eyebrow">Week review</p><h2>{prior?prior.period_starts_on+" → "+prior.period_ends_on:"No prior committed week"}</h2></div>
        {prior?<span>{prior.status}</span>:null}
      </div>
      {review&&prior?<>
        <div className="handoff-review-grid">
          <span><strong>{fmt(review.targetMinutes)}</strong> final course target</span>
          <span><strong>{fmt(review.creditedMinutes)}</strong> credited work</span>
          <span><strong>{review.adherencePercent}%</strong> adherence</span>
          <span><strong>{fmt(review.droppedEnvelopeMinutes)}</strong> expired envelope</span>
        </div>
        <p className="handoff-debt-rule">{data.previousEnded
          ? <><strong>{fmt(review.droppedEnvelopeMinutes)} unfinished study minutes expired with the weekly envelope and do not carry forward as debt.</strong> Current P17/P20 evidence determines next week's allocation instead.</>
          : <><strong>{fmt(review.droppedEnvelopeMinutes)} course minutes are still unfilled in the current week.</strong> They expire rather than becoming debt only after this Sunday ends.</>}</p>
        <div className="handoff-course-grid">
          {review.courses.map(course=><article key={course.courseId}>
            <div><strong>{course.shortName??course.displayName}</strong><span>{course.adherencePercent}%</span></div>
            <p>{fmt(course.creditedMinutes)} credited / {fmt(course.targetMinutes)} target</p>
            <small>{course.droppedEnvelopeMinutes?fmt(course.droppedEnvelopeMinutes)+" expired":course.overageMinutes?fmt(course.overageMinutes)+" above target":"target met"} · readiness {course.priorReadinessIndex??"—"} → {course.currentReadinessIndex??"—"} ({signed(course.readinessDelta)}){course.floorAdjustmentMinutes?" · P20 "+signed(course.floorAdjustmentMinutes)+"m":""}{course.sacrificed?" · protection-floor sacrifice":""}</small>
          </article>)}
        </div>
      </>:<p>No P19 plan exists for the week ending {data.previousEnd}. P21 will still prepare the next-week scenario from current semester evidence.</p>}
    </section>

    <section className="panel handoff-obligations">
      <div className="section-heading">
        <div><p className="eyebrow">Real obligations</p><h2>What actually carries forward</h2></div>
        <span>{data.mandatoryCommitments.length}</span>
      </div>
      <p>Open assignments/deadlines are not copied into a new debt bucket. They remain the same P10 commitments with the same IDs and original due dates.</p>
      {data.carryoverCommitments.length?<div className="handoff-obligation-group">
        <h3>{data.previousEnded?"Carried unresolved obligations":"Currently open before next Monday"}</h3>
        {data.carryoverCommitments.map(item=><article key={item.id}>
          <div><strong>{item.title}</strong><span>{fmt(Number(item.estimated_minutes))}</span></div>
          <small>{item.course_short_name??item.course_name??"General"} · due {dueLabel(item.due_at)} · priority {item.priority}/5</small>
        </article>)}
      </div>:<p className="muted">No unresolved commitment currently crosses into the next week.</p>}
      {data.dueInTargetCommitments.length?<div className="handoff-obligation-group">
        <h3>Due during {data.targetStart} → {data.targetEnd}</h3>
        {data.dueInTargetCommitments.map(item=><article key={item.id}>
          <div><strong>{item.title}</strong><span>{fmt(Number(item.estimated_minutes))}</span></div>
          <small>{item.course_short_name??item.course_name??"General"} · due {dueLabel(item.due_at)} · priority {item.priority}/5</small>
        </article>)}
      </div>:null}
    </section>

    <section className="panel handoff-adaptation">
      <div className="section-heading">
        <div><p className="eyebrow">Semester adaptation</p><h2>{data.recommendation.objective.replaceAll("_"," ")}</h2></div>
        <span>P17 + P20</span>
      </div>
      <p><strong>Objective:</strong> {data.recommendation.reason}</p>
      <p><strong>Capacity:</strong> {data.capacity.calibrationNote}</p>
      <div className="handoff-adaptation-grid">
        <span><strong>{data.calibration.completedWeeks}</strong> completed weeks</span>
        <span><strong>{data.calibration.capacitySignal.replaceAll("_"," ")}</strong> capacity signal</span>
        <span><strong>{adjusted.length}</strong> calibrated floors</span>
        <span><strong>{review?.courses.filter(course=>course.readinessDelta!=null&&course.readinessDelta>0).length??0}</strong> courses improving vs prior snapshot</span>
      </div>
    </section>

    <section className={"panel handoff-next "+(data.scenario.feasibleProtection?"handoff-feasible":"handoff-infeasible")}>
      <div className="section-heading">
        <div><p className="eyebrow">Next-week scenario</p><h2>{data.targetStart} → {data.targetEnd}</h2></div>
        <span>{data.source.replace("_"," ")}</span>
      </div>
      <div className="handoff-summary-grid">
        <span><strong>{fmt(data.nominalWeeklyMinutes)}</strong> P10 nominal ceiling</span>
        <span><strong>{data.calendarFreeMinutes==null?"—":fmt(data.calendarFreeMinutes)}</strong> calendar free</span>
        <span><strong>{fmt(data.capacity.retentionMinutes)}</strong> retention reserve</span>
        <span><strong>{fmt(data.scenario.allocatedCourseMinutes)}</strong> allocated course work</span>
      </div>
      {data.calendarStale?<p className="scenario-warning">Calendar data is stale; refresh P11 before committing if availability has changed.</p>:null}
      {data.scenario.mandatoryShortfallMinutes>0?<p className="scenario-warning"><strong>{fmt(data.scenario.mandatoryShortfallMinutes)} mandatory-work deficit.</strong> The next week cannot be committed at this capacity while those obligations remain open.</p>:null}
      <div className="handoff-next-courses">
        {data.scenario.allocations.map(row=><article key={row.courseId}>
          <div><strong>{row.shortName??row.displayName}</strong><span>{fmt(row.allocatedMinutes)}</span></div>
          <small>{fmt(row.protectionFloorMinutes)} floor{row.floorCalibrationMinutes?" · P20 "+signed(row.floorCalibrationMinutes)+"m":""} · {row.band.replaceAll("_"," ")} · {row.runway} runway</small>
          {!row.floorMet?<p>Protection shortfall: {fmt(row.floorShortfallMinutes)}</p>:null}
        </article>)}
      </div>
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Explicit handoff</p><h2>{targetActive?"Next week committed":"Review, then commit"}</h2></div></div>
      <HandoffControls
        previousPlanId={prior?.id??null}
        closeAllowed={data.closeAllowed}
        targetPlanActive={targetActive}
        commitAllowed={data.commitAllowed&&data.scenario.mandatoryShortfallMinutes===0}
        recommendedObjective={data.recommendation.objective}
        recommendedCapacityMinutes={data.capacity.selectedCapacityMinutes}
        feasibleCapacityMinutes={data.capacity.feasibleCapacityMinutes}
      />
      <div className="button-row"><Link className="secondary-button" href="/quality">Inspect P20 calibration</Link><Link className="secondary-button" href="/outlook">Review P17 outlook</Link><Link className="secondary-button" href="/week">Open current week</Link></div>
    </section>
  </main>;
}
