import Link from "next/link";
import type { DailyPlan as DailyPlanType, PlannedItem } from "@/lib/study/planner";

function ActionLink({item,label,primary=false}:{item:PlannedItem;label:string;primary?:boolean}){
  const className=primary?"primary-button":"secondary-button";
  if(item.href.startsWith("http")) return <a className={className} href={item.href} target="_blank" rel="noreferrer">{label}</a>;
  return <Link className={className} href={item.href}>{label}</Link>;
}

export function DailyPlan({plan}:{plan:DailyPlanType}){
  const current=plan.selected[0]??null;
  const next=plan.selected.slice(1);
  const focus=plan.selected.filter((item)=>item.kind!=="review");

  return <section className="study-sequence" aria-labelledby="today-sequence-title">
    <div className="study-sequence-heading">
      <div><span className="section-kicker">Study order</span><h2 id="today-sequence-title">Your study order</h2></div>
      <span className="study-budget">{plan.usedMinutes}<small> / {plan.budgetMinutes} min</small></span>
    </div>

    {current ? <article className="now-task">
      <div className="now-rail"><span>Now</span><i/></div>
      <div className="now-copy">
        <span className="task-context">{current.courseName??(current.kind==="review"?"All courses":"Semester")}</span>
        <h3>{current.title}</h3>
        <p>{current.reason}</p>
        <div className="task-meta"><span>{current.scheduledMinutes} min</span>{current.partial?<span>partial block</span>:null}{current.urgent?<span className="urgent-tag">urgent</span>:null}</div>
      </div>
      <ActionLink item={current} label="Start" primary/>
    </article> : <div className="sequence-empty"><strong>Nothing scheduled.</strong><span>No tasks were selected for this plan. Check your weekly commitment and course materials if you expected work.</span></div>}

    {next.length ? <ol className="next-task-list">{next.map((item,index)=><li key={item.id}>
      <div className="sequence-marker"><span>{index+2}</span><i/></div>
      <div className="next-task-copy">
        <span className="task-context">{item.courseName??(item.kind==="review"?"All courses":"Semester")}</span>
        <strong>{item.title}</strong>
        <p>{item.reason}</p>
      </div>
      <div className="next-task-end"><span>{item.scheduledMinutes} min</span><ActionLink item={item} label="Open"/></div>
    </li>)}</ol>:null}

    <footer className="sequence-footer">
      <span>{focus.length} focus item{focus.length===1?"":"s"}</span>
      <span>{plan.remainingMinutes} min intentionally free</span>
      {plan.deferred.length?<details className="deferred-work"><summary>{plan.deferred.length} deferred</summary><div>{plan.deferred.slice(0,12).map(item=><p key={item.id}><strong>{item.title}</strong><span>{item.estimatedMinutes} min · {item.reason}</span></p>)}</div></details>:null}
    </footer>
  </section>;
}
