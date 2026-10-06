import Link from "next/link";
import { Nav } from "@/components/nav";
import { WeeklyPlanControls } from "@/components/weekly-plan-controls";
import { getWeeklyCommitmentData } from "@/lib/study/weekly-plan-data";
import type { ScenarioObjective } from "@/lib/study/scenario";

export const dynamic="force-dynamic";

const OBJECTIVE_LABELS:Record<ScenarioObjective,string>={
  protect_passes:"Protect passes",
  balanced:"Balanced",
  target_performance:"Target 80+",
  exam_period:"Exam period",
};

function fmt(min:number){
  const rounded=Math.max(0,Math.round(min));
  const h=Math.floor(rounded/60),m=rounded%60;
  return h?(m?h+"h "+m+"m":h+"h"):m+"m";
}

function CalibrationSummary({profile}:{profile:Awaited<ReturnType<typeof getWeeklyCommitmentData>>["scenarioData"]["calibration"]}){
  const adjusted=profile.courses.filter(course=>course.adjustmentApplied).length;
  return <section className="panel week-calibration-summary">
    <div className="section-heading"><div><p className="eyebrow">P20 · allocation calibration</p><h2>{profile.completedWeeks} completed week{profile.completedWeeks===1?"":"s"}</h2></div><span>{profile.evidence}</span></div>
    <p>{profile.completedWeeks<3
      ?"P18/P19 still use the original course-floor heuristics until three completed weekly commitments exist."
      :adjusted
        ?adjusted+" course protection floor"+(adjusted===1?" is":"s are")+" calibrated from repeated execution evidence."
        :"Enough history exists to evaluate allocation quality, but no floor correction is currently supported."}</p>
    <div className="button-row"><Link className="secondary-button" href="/quality">Inspect execution quality</Link></div>
  </section>;
}

export default async function WeekPage(){
  const data=await getWeeklyCommitmentData();
  const {envelope,runtime,proposal}=data;
  const calibration=data.scenarioData.calibration;

  if(!runtime){
    const preview=data.preview;
    return <main className="shell">
      <header className="header"><div><p className="eyebrow">P19 · weekly commitment</p><h1>This week</h1></div><Nav /></header>

      <section className="panel week-hero">
        <div><p className="eyebrow">{envelope.today} → {envelope.periodEndsOn}</p><h2>No weekly commitment yet</h2></div>
        <p>P18 can explore trade-offs freely. P19 turns one feasible scenario into an operational envelope that P10 can follow for the rest of this calendar week.</p>
        <div className="week-budget-grid">
          <span><strong>{fmt(envelope.feasibleCapacityMinutes)}</strong> feasible capacity</span>
          <span><strong>{fmt(envelope.mandatoryMinutes)}</strong> commitments</span>
          <span><strong>{fmt(envelope.retentionMinutes)}</strong> retention</span>
          <span><strong>{fmt(envelope.courseBudgetMinutes)}</strong> course budget</span>
        </div>
      </section>

      <CalibrationSummary profile={calibration}/>

      <section className={"panel "+(preview.feasibleProtection?"week-preview-ok":"week-preview-warning")}>
        <div className="section-heading"><div><p className="eyebrow">Balanced preview</p><h2>{preview.feasibleProtection?"Protection floors fit":"Explicit trade-off required"}</h2></div><span>{fmt(preview.allocatedCourseMinutes)}</span></div>
        <p>{preview.summary}</p>
        {preview.allocations.length?<div className="week-preview-list">{preview.allocations.map(row=><div key={row.courseId}><strong>{row.shortName??row.displayName}</strong><span>{fmt(row.allocatedMinutes)}</span></div>)}</div>:null}
      </section>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Commit scenario</p><h2>Lock the remainder of this week</h2></div></div>
        <p className="muted">The capacity field cannot exceed the currently feasible remainder of the week. Course-floor shortfalls may be committed deliberately; mandatory-work deficits may not.</p>
        <WeeklyPlanControls activePlanId={null} baselineCapacityMinutes={envelope.feasibleCapacityMinutes} defaultObjective="balanced" canRebalance={false}/>
        <div className="button-row"><Link className="secondary-button" href="/scenarios">Compare P18 scenarios</Link><Link className="secondary-button" href="/outlook">Review P17 outlook</Link></div>
      </section>
    </main>;
  }

  const progress=runtime.progress;
  const completionMap=new Map(runtime.completion.map(row=>[row.courseId,row]));
  const proposalMap=new Map((proposal?.courses??[]).map(row=>[row.courseId,row]));
  const behind=progress.courses.filter(row=>row.paceStatus==="behind"||row.paceStatus==="not_started").length;
  const objective=runtime.plan.objective as ScenarioObjective;

  return <main className="shell">
    <header className="header"><div><p className="eyebrow">P19 · rolling weekly plan</p><h1>This week</h1></div><Nav /></header>

    <section className="panel week-hero">
      <div className="week-hero-head">
        <div><p className="eyebrow">{runtime.plan.period_starts_on} → {runtime.plan.period_ends_on}</p><h2>{OBJECTIVE_LABELS[objective]}</h2></div>
        <span>revision {runtime.plan.revision}</span>
      </div>
      <div><span className="metric">{progress.totalCompletedMinutes}</span><span className="metric-unit"> / {progress.totalTargetMinutes} course min credited</span></div>
      <div className="bar"><i style={{width:progress.completionPercent+"%"}}/></div>
      <p>{runtime.daysRemaining} day{runtime.daysRemaining===1?"":"s"} remain · {behind} course{behind===1?" is":"s are"} behind committed pace. Credited course minutes use recorded StudyOS sessions or conservative workflow-milestone estimates, whichever is larger for that course.</p>
      <div className="week-budget-grid">
        <span><strong>{fmt(Number(runtime.plan.weekly_capacity_minutes))}</strong> committed capacity</span>
        <span><strong>{fmt(Number(runtime.plan.mandatory_reserve_minutes))}</strong> mandatory reserve</span>
        <span><strong>{fmt(Number(runtime.plan.retention_reserve_minutes))}</strong> retention reserve</span>
        <span><strong>{fmt(progress.totalRemainingMinutes)}</strong> course minutes remaining</span>
      </div>
    </section>

    <CalibrationSummary profile={calibration}/>

    <section className="week-course-list">
      {progress.courses.map(row=>{
        const evidence=completionMap.get(row.courseId);
        const proposed=proposalMap.get(row.courseId);
        return <article className={"panel week-course pace-"+row.paceStatus} key={row.courseId}>
          <div className="week-course-head">
            <div><p className="eyebrow">{row.paceStatus.replace("_"," ")}</p><h2>{row.shortName??row.displayName}</h2></div>
            <strong>{fmt(row.completedMinutes)} / {fmt(row.targetMinutes)}</strong>
          </div>
          <div className="bar"><i style={{width:Math.min(100,row.completionPercent)+"%"}}/></div>
          <div className="week-course-metrics">
            <span><strong>{fmt(row.originalMinutes)}</strong> original</span>
            <span><strong>{fmt(row.targetMinutes)}</strong> current target</span>
            <span><strong>{fmt(row.remainingMinutes)}</strong> remaining</span>
            <span><strong>{fmt(row.expectedMinutesByNow)}</strong> expected by now</span>
          </div>
          <p><strong>Current action:</strong> {row.actionTitle}</p>
          <small>Evidence: {fmt(evidence?.sessionMinutes??0)} recorded sessions · {fmt(evidence?.workflowMinutes??0)} workflow credit.</small>
          {proposed&&proposal?.material&&proposed.deltaMinutes!==0?<p className={proposed.deltaMinutes>0?"week-delta positive":"week-delta negative"}>Proposed rebalance: {fmt(proposed.currentTargetMinutes)} → {fmt(proposed.proposedTargetMinutes)} ({proposed.deltaMinutes>0?"+":""}{proposed.deltaMinutes} min)</p>:null}
          <div className="button-row"><Link className="secondary-button" href={row.actionHref}>Open course action</Link></div>
        </article>;
      })}
    </section>

    <section className={"panel week-rebalance "+(proposal?.material?"material":"stable")}>
      <div className="section-heading"><div><p className="eyebrow">Rolling reallocation</p><h2>{proposal?.material?"Rebalance recommended":"Committed envelopes still fit"}</h2></div><span>{proposal?.reason.replace("_"," ")??"stable"}</span></div>
      <p>{proposal?.reasonText}</p>
      {proposal?.material?<div className="week-rebalance-metrics">
        <span><strong>{fmt(proposal.committedRemainingMinutes)}</strong> committed remaining</span>
        <span><strong>{fmt(proposal.feasibleRemainingMinutes)}</strong> feasible remaining</span>
        <span><strong>{fmt(proposal.proposedCourseBudgetMinutes)}</strong> proposed total course budget</span>
      </div>:null}
      <WeeklyPlanControls activePlanId={runtime.plan.id} baselineCapacityMinutes={envelope.feasibleCapacityMinutes} defaultObjective={objective} canRebalance={Boolean(proposal?.material)}/>
      <small>Reallocation is proposed automatically but applied explicitly. Original committed minutes remain preserved for comparison.</small>
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Current remainder</p><h2>Capacity from today through Sunday</h2></div><span>{fmt(envelope.feasibleCapacityMinutes)}</span></div>
      <div className="week-budget-grid">
        <span><strong>{fmt(envelope.mandatoryMinutes)}</strong> open commitments</span>
        <span><strong>{fmt(envelope.retentionMinutes)}</strong> retention reserve</span>
        <span><strong>{fmt(envelope.courseBudgetMinutes)}</strong> feasible future course work</span>
        <span><strong>{envelope.calendarFreeMinutes==null?"—":fmt(envelope.calendarFreeMinutes)}</strong> calendar free time</span>
      </div>
      <div className="button-row"><Link className="secondary-button" href="/scenarios">Open P18 scenarios</Link><Link className="secondary-button" href="/outlook">Open P17 outlook</Link></div>
    </section>
  </main>;
}
