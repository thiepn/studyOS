"use client";

import { useMemo,useState } from "react";
import { buildScenario, buildStandardScenarios, type ScenarioObjective } from "@/lib/study/scenario";
import type { SemesterScenarioData } from "@/lib/study/scenario-data";

const labels:Record<ScenarioObjective,string>={
  protect_passes:"Protect passes",
  balanced:"Balanced",
  target_performance:"Target 80+",
  exam_period:"Exam period",
};

function fmt(min:number){const h=Math.floor(min/60),m=min%60;return h?m?h+"h "+m+"m":h+"h":m+"m";}

export function ScenarioPlanner({data}:{data:SemesterScenarioData}){
  const [capacity,setCapacity]=useState(data.baselineWeeklyMinutes);
  const [objective,setObjective]=useState<ScenarioObjective>("balanced");
  const retention=useMemo(()=>{
    const after=Math.max(0,capacity-data.mandatoryCommitmentMinutes);
    return Math.max(0,Math.round(Math.min(
      data.maxWeeklyRetentionMinutes,
      after*data.configuredReviewRatio,
    )/15)*15);
  },[capacity,data]);
  const plan=useMemo(()=>buildScenario({
    weeklyCapacityMinutes:capacity,
    mandatoryCommitmentMinutes:data.mandatoryCommitmentMinutes,
    retentionReserveMinutes:retention,
    objective,
    courses:data.courses,
    floorAdjustments:data.calibration.floorAdjustments,
  }),[capacity,retention,objective,data]);

  const matrix=useMemo(()=>buildStandardScenarios({
    weeklyCapacityMinutes:capacity,mandatoryCommitmentMinutes:data.mandatoryCommitmentMinutes,
    retentionReserveMinutes:retention,courses:data.courses,
    floorAdjustments:data.calibration.floorAdjustments,
  }),[capacity,retention,data]);

  return <>
    <section className="panel scenario-controls">
      <div className="section-heading"><div><p className="eyebrow">Capacity constraint</p><h2>{fmt(capacity)} this week</h2></div><span>{data.source.replace("_"," ")}</span></div>
      <input aria-label="Weekly study capacity" type="range" min={data.minCustomCapacity} max={data.maxCustomCapacity} step={15} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/>
      <div className="scenario-capacity-meta">
        <span><strong>{fmt(data.nominalWeeklyMinutes)}</strong> configured weekly ceiling</span>
        <span><strong>{data.calendarFreeMinutes==null?"—":fmt(data.calendarFreeMinutes)}</strong> calendar free time</span>
        <span><strong>{fmt(data.mandatoryCommitmentMinutes)}</strong> mandatory commitments</span>
        <span><strong>{fmt(retention)}</strong> retention reserve</span>
      </div>
      {data.calendarFreeMinutes!=null&&capacity>data.calendarFreeMinutes?<p className="scenario-warning"><strong>Counterfactual only:</strong> this scenario exceeds current seven-day calendar free time by {fmt(capacity-data.calendarFreeMinutes)} and would require freeing calendar time.</p>:null}
      {data.calibration.completedWeeks>=3?<p className="scenario-calibration-note"><strong>P20 calibration active:</strong> {Object.keys(data.calibration.floorAdjustments).length} course floor{Object.keys(data.calibration.floorAdjustments).length===1?"":"s"} adjusted from completed-week execution evidence.</p>:null}
      <div className="scenario-objectives">
        {(Object.keys(labels) as ScenarioObjective[]).map(key=><button key={key} className={objective===key?"active":""} onClick={()=>setObjective(key)}>{labels[key]}</button>)}
      </div>
    </section>

    <section className={"panel scenario-summary "+(plan.feasibleProtection?"scenario-feasible":"scenario-infeasible")}>
      <div className="section-heading"><div><p className="eyebrow">{labels[objective]}</p><h2>{plan.feasibleProtection?"All protection floors fit":"Capacity conflict"}</h2></div><span>{fmt(plan.allocatableCourseMinutes)} allocatable</span></div>
      <p>{plan.summary}</p>
      <div className="scenario-budget-stack">
        <span><strong>{fmt(plan.mandatoryCommitmentMinutes)}</strong> commitments</span>
        <span><strong>{fmt(plan.retentionReserveMinutes)}</strong> retention</span>
        <span><strong>{fmt(plan.allocatedCourseMinutes)}</strong> course allocation</span>
        <span><strong>{fmt(plan.unusedMinutes)}</strong> unused</span>
      </div>
      {plan.mandatoryShortfallMinutes>0?<p className="scenario-warning"><strong>{fmt(plan.mandatoryShortfallMinutes)} mandatory-work deficit.</strong> Commitments alone exceed the selected capacity.</p>:null}
      {plan.totalFloorShortfallMinutes>0?<p className="scenario-warning"><strong>{fmt(plan.totalFloorShortfallMinutes)} course-protection shortfall</strong> across {plan.sacrificedCourses} course{plan.sacrificedCourses===1?"":"s"}.</p>:null}
    </section>

    <section className="scenario-allocation-list">
      {plan.allocations.map(row=><article className={"panel scenario-course "+(!row.floorMet?"scenario-sacrificed":"")} key={row.courseId}>
        <div className="scenario-course-head">
          <div><p className="eyebrow">{row.band.replaceAll("_"," ")} · {row.runway} runway</p><h2>{row.shortName??row.displayName}</h2></div>
          <strong>{fmt(row.allocatedMinutes)}</strong>
        </div>
        <div className="scenario-bar"><i style={{width:Math.min(100,row.protectionFloorMinutes?row.allocatedMinutes/row.protectionFloorMinutes*100:100)+"%"}}/></div>
        <p>{row.reason}</p>
        <div className="scenario-course-meta">
          <span><strong>{fmt(row.protectionFloorMinutes)}</strong> floor</span>
          <span><strong>{row.sharePercent}%</strong> course-capacity share</span>
          <span><strong>{row.readinessIndex==null?"—":row.readinessIndex+"/100"}</strong> readiness</span>
          <span><strong>{row.marginalScore}/100</strong> marginal value</span>
        </div>
        {!row.floorMet?<p className="scenario-shortfall">Sacrifice #{row.sacrificeRank}: short by {fmt(row.floorShortfallMinutes)}.</p>:null}
        <small>Current highest-value action: {row.actionTitle}</small>
      </article>)}
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Trade-off matrix</p><h2>How the objective changes allocation</h2></div><span>same capacity</span></div>
      <div className="scenario-table-wrap"><table className="scenario-table"><thead><tr><th>Course</th><th>Protect passes</th><th>Balanced</th><th>Target 80+</th><th>Exam period</th></tr></thead>
      <tbody>{data.courses.filter(c=>!c.postExam).map(course=>{
        const get=(plan:any)=>plan.allocations.find((x:any)=>x.courseId===course.courseId)?.allocatedMinutes??0;
        return <tr key={course.courseId}><td>{course.shortName??course.displayName}</td><td>{fmt(get(matrix.protectPasses))}</td><td>{fmt(get(matrix.balanced))}</td><td>{fmt(get(matrix.targetPerformance))}</td><td>{fmt(get(matrix.examPeriod))}</td></tr>;
      })}</tbody></table></div>
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Capacity stress test</p><h2>What breaks when the week shrinks?</h2></div></div>
      <div className="scenario-stress-grid">{data.stress.map(item=><article key={item.key}>
        <strong>{item.label}</strong><b>{fmt(item.minutes)}</b><span>{item.plan.feasibleProtection
          ?"all floors protected"
          :item.plan.mandatoryShortfallMinutes>0
            ?fmt(item.plan.mandatoryShortfallMinutes)+" mandatory deficit"
            :fmt(item.plan.totalFloorShortfallMinutes)+" course-floor shortfall"}</span>
      </article>)}</div>
    </section>
  </>;
}
