import Link from "next/link";
import {CALENDAR_EVIDENCE,calendarEvidenceStatus,planningDeadlineSummary} from "@/lib/study/planning-command";
import type {CommitmentRow,CurrentCapacity} from "@/lib/study/planning";

type CalendarView={
  connection:{status:string;last_sync_at:string|null;last_sync_status:string|null;last_error:string|null}|null;
  stale:boolean;proposal:{blocks:readonly unknown[];unscheduled:readonly unknown[]};timezone:string;
};

export function PlanningCommandOverview({commitments,capacity,calendar,hasWeeklyCommitment,now}:{
  commitments:CommitmentRow[];capacity:CurrentCapacity;calendar:CalendarView;
  hasWeeklyCommitment:boolean;now:Date;
}){
  const deadline=planningDeadlineSummary(commitments,now);
  const state=calendarEvidenceStatus(calendar.connection,calendar.stale);
  return <section id="planning-command-center" className="planning-command-overview" aria-labelledby="planning-command-heading">
    <div className="planning-command-head"><div><p className="section-kicker">Calendar / planning desk</p>
      <h2 id="planning-command-heading">Plan against the evidence, not an assumed calendar.</h2></div>
      <Link href="/week">Inspect this week →</Link>
    </div>
    <dl className="planning-command-stats">
      <div><dt>Open deadlines</dt><dd>{deadline.total}</dd><p>{deadline.overdue} overdue · {deadline.dueSoon} due within 48h</p></div>
      <div><dt>Today's capacity</dt><dd>{capacity.total_budget_minutes} <small>min</small></dd><p>{capacity.mode.replaceAll("_"," ")} mode</p></div>
      <div><dt>Study block suggestions</dt><dd>{calendar.proposal.blocks.length}</dd><p>{calendar.proposal.unscheduled.length} cannot currently be placed</p></div>
      <div><dt>Calendar evidence</dt><dd className="planning-command-status" data-state={state}>{CALENDAR_EVIDENCE[state].label}</dd>
        <p>{CALENDAR_EVIDENCE[state].description}</p></div>
    </dl>
    <div className="planning-command-next">
      <p>{deadline.next?<><strong>Next registered deadline:</strong> {deadline.next.title} · {new Date(deadline.next.due_at).toLocaleString("en-GB",{timeZone:calendar.timezone,dateStyle:"medium",timeStyle:"short"})}</>:
        "No open deadline is registered for this semester."}</p>
      <p>{hasWeeklyCommitment?"A weekly commitment is recorded; changes still require explicit action.":"No weekly commitment is recorded; scenarios are previews until explicitly committed."}</p>
    </div>
    <nav className="planning-command-nav" aria-label="Planning actions">
      <a href="#today-schedule">Review Calendar & deadlines</a>
      <a href="#today-adjust">Adjust capacity</a>
      <Link href="/week">Week allocation</Link>
      <Link href="/scenarios">Compare scenarios</Link>
    </nav>
  </section>;
}
