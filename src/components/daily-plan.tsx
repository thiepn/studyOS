import Link from "next/link";
import type { DailyPlan as DailyPlanType, PlannedItem } from "@/lib/study/planner";

function ActionLink({item,label}:{item:PlannedItem;label:string}){
  if(item.href.startsWith("http")) return <a className="secondary-button" href={item.href} target="_blank" rel="noreferrer">{label}</a>;
  return <Link className="secondary-button" href={item.href}>{label}</Link>;
}

export function DailyPlan({plan}:{plan:DailyPlanType}){
  const focus=plan.selected.filter((item)=>item.kind!=="review");
  return <section className="panel daily-plan">
    <div className="section-heading"><div><p className="eyebrow">Semester Autopilot</p><h2>Today&apos;s bounded plan</h2></div><span>{plan.usedMinutes}/{plan.budgetMinutes} min</span></div>
    <p className="muted">Generated from due retention, deadlines, course workflow, cumulative checkpoints, exam mode, and course risk. Priority can change; the capacity ceiling does not.</p>
    {plan.selected.length?<ol className="daily-plan-list">{plan.selected.map((item,index)=><li key={item.id}>
      <div className="plan-order">{index+1}</div>
      <div className="plan-copy"><div><strong>{item.title}</strong><span>{item.courseName??(item.kind==="review"?"All courses":"Semester")}</span></div><p>{item.reason}</p><div className="plan-tags"><span>{item.scheduledMinutes} min</span>{item.partial?<span>partial block</span>:null}{item.urgent?<span className="urgent-tag">urgent</span>:null}</div></div>
      <ActionLink item={item} label={index===0?"Start":"Open"}/>
    </li>)}</ol>:<div className="empty-state"><h3>No scheduled work</h3><p>Nothing currently fits or requires today&apos;s capacity.</p></div>}
    <div className="plan-footer"><span>{focus.length} focus item{focus.length===1?"":"s"}</span><span>{plan.remainingMinutes} min unallocated</span><span>{plan.deferred.length} deferred by capacity</span></div>
    {plan.deferred.length?<details className="deferred-work"><summary>Deferred work ({plan.deferred.length})</summary><div>{plan.deferred.slice(0,12).map((item)=><p key={item.id}><strong>{item.title}</strong><span>{item.estimatedMinutes} min · {item.reason}</span></p>)}</div><small>Deferred work remains prioritized in future plans, but it does not inflate tomorrow&apos;s time budget.</small></details>:null}
  </section>;
}
