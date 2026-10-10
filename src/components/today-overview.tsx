import Link from "next/link";
import type {TodayOverviewData} from "@/lib/study/today-overview";
export function TodayOverview({data,mode,weekPercent}:{
  data:TodayOverviewData;mode:string;weekPercent:number|null;
}){
  return <section className="today-overview" aria-labelledby="today-overview-heading">
    <header className="today-overview-heading">
      <div><span className="section-kicker">Your day at a glance</span>
        <h2 id="today-overview-heading">A plan you can actually follow.</h2></div>
      <span className="today-overview-mode">{mode.replaceAll("_"," ")} capacity</span>
    </header>
    <dl className="today-overview-facts">
      <div><dt>Study allocated</dt><dd><strong>{data.plannedMinutes}</strong><span> / {data.budgetMinutes} min</span></dd>
        <p>{data.freeMinutes} min intentionally unallocated</p></div>
      <div><dt>Reviews due</dt><dd><strong>{data.reviewDueMinutes}</strong><span> min due</span></dd>
        <p>{data.reviewScheduledMinutes} min scheduled in this plan</p></div>
      <div><dt>Deadlines</dt><dd><strong>{data.overdueCommitments+data.dueSoonCommitments}</strong><span> need attention</span></dd>
        <p>{data.overdueCommitments} overdue · {data.dueSoonCommitments} due within 48h</p></div>
    </dl>
    <div className="today-overview-bottom">
      <p><strong>{data.focusItems} focus task{data.focusItems===1?"":"s"}</strong>
        {data.focusCourses.length?<> · {data.focusCourses.slice(0,3).join(", ")}{data.focusCourses.length>3?" and others":""}</>:null}
        {weekPercent==null?<> · Weekly plan not committed</>:<> · {weekPercent}% weekly commitment complete</>}
        {data.urgentPlannedItems?<> · {data.urgentPlannedItems} urgent scheduled</>:null}</p>
      <nav className="today-overview-links" aria-label="Today's shortcuts">
        <a href="#today-sequence-title">Study order</a><a href="#today-decisions">Changes</a>
        <a href="#today-schedule">Deadlines</a><a href="#today-adjust">Capacity</a>
        <Link href="/courses">Courses</Link>
      </nav>
    </div>
  </section>;
}
