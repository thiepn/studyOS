import Link from "next/link";
import type { DailyPlan as DailyPlanType, PlannedItem } from "@/lib/study/planner";
import { WorkspaceIcon } from "@/components/workspace-icon";

function ActionLink({item,label,primary=false}:{item:PlannedItem;label:string;primary?:boolean}){
  const className=primary?"primary-button":"secondary-button";
  const content=<>{label}{primary?<span className="action-arrow" aria-hidden="true">→</span>:null}</>;
  if(item.href.startsWith("http")) return <a className={className} href={item.href} target="_blank" rel="noreferrer" aria-label={`${label}: ${item.title}, ${item.scheduledMinutes} minutes`}>{content}</a>;
  return <Link className={className} href={item.href} aria-label={`${label}: ${item.title}, ${item.scheduledMinutes} minutes`}>{content}</Link>;
}

export function DailyPlan({plan}:{plan:DailyPlanType}){
  const current=plan.selected[0]??null;
  const next=plan.selected.slice(1);
  const focus=plan.selected.filter((item)=>item.kind!=="review");

  return <section className="study-sequence" aria-labelledby="today-sequence-title">
    <div className="study-sequence-heading">
      <div><h2 id="today-sequence-title">What to study next</h2></div>
      <span className="study-budget">{plan.usedMinutes}<small> min planned</small></span>
    </div>

    {current ? <article className="now-task" aria-label="First recommended task">
      <div className="now-copy">
        <span className="task-context"><span className="task-current-dot"/> Up next · {current.courseName??(current.kind==="review"?"All courses":"Semester")}</span>
        <h3>{current.title}</h3>
        <p>{current.reason}</p>
        <div className="task-meta"><span><WorkspaceIcon name="clock"/>{current.scheduledMinutes} min</span>{current.partial?<span>partial block</span>:null}{current.urgent?<span className="urgent-tag">Urgent priority</span>:null}</div>
      </div>
      <ActionLink item={current} label="Start" primary/>
    </article> : <div className="sequence-empty"><strong>Nothing scheduled.</strong><span>Open a course to find materials and practice, or adjust your available time below.</span><Link href="/courses">Open your courses →</Link></div>}

    {next.length ? <><h3 className="next-task-heading">Then, when you’re ready</h3><ol className="next-task-list" aria-label="Upcoming study tasks">{next.slice(0,3).map((item)=><li key={item.id}>
      <span className="task-list-icon" aria-hidden="true"><WorkspaceIcon name={item.kind==="commitment"?"today":item.kind==="review"?"study":"book"}/></span>
      <div className="next-task-copy">
        <span className="task-context">{item.courseName??(item.kind==="review"?"All courses":"Semester")}</span>
        <strong>{item.title}</strong>
        <p>{item.reason}</p>
      </div>
      <div className="next-task-end"><span>{item.scheduledMinutes} min</span><ActionLink item={item} label="Open"/></div>
    </li>)}</ol></>:null}

    {next.length>3?<details className="course-summary"><summary>{next.length-3} more planned tasks</summary>{next.slice(3).map(item=><p key={item.id}>{item.courseName} · {item.title} · {item.scheduledMinutes} min <ActionLink item={item} label="Open"/></p>)}</details>:null}
    <footer className="sequence-footer">
      <span>{focus.length} focus item{focus.length===1?"":"s"}</span>
      <span>{plan.remainingMinutes} min intentionally free</span>
      {plan.deferred.length?<details className="deferred-work"><summary>{plan.deferred.length} deferred</summary><div>{plan.deferred.slice(0,12).map(item=><p key={item.id}><strong>{item.title}</strong><span>{item.estimatedMinutes} min · {item.reason}</span></p>)}</div></details>:null}
    </footer>
  </section>;
}
