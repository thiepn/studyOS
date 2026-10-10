/** Read-only projections for planning decisions: never alter the planner or event ledger. */
export type CalendarConnectionEvidence = {
  status:string;last_sync_at:string|null;last_sync_status:string|null;last_error:string|null;
};
export type CalendarEvidenceState = "disconnected"|"never_synced"|"sync_failed"|"unknown"|"stale"|"recent";
export function calendarEvidenceStatus(connection:CalendarConnectionEvidence|null,stale:boolean):CalendarEvidenceState{
  if(!connection||connection.status!=="connected")return "disconnected";
  if(connection.last_sync_status==="error"||Boolean(connection.last_error))return "sync_failed";
  if(!connection.last_sync_at||!Number.isFinite(Date.parse(connection.last_sync_at)))return "never_synced";
  if(connection.last_sync_status!=="ok")return "unknown";
  return stale?"stale":"recent";
}
export const CALENDAR_EVIDENCE:Record<CalendarEvidenceState,{label:string;description:string}>={
  disconnected:{label:"Calendar not connected",description:"No Google Calendar free/busy evidence is available."},
  never_synced:{label:"Not yet synced",description:"A connected account is not evidence that the current schedule has been read."},
  sync_failed:{label:"Sync failed",description:"Calendar events may be incomplete. Retry sync and inspect connection errors."},
  unknown:{label:"Sync unverified",description:"The latest recorded sync has no confirmed successful result."},
  stale:{label:"Snapshot outdated",description:"The last successful Calendar snapshot is older than the six-hour freshness window."},
  recent:{label:"Recent snapshot",description:"Last Calendar sync succeeded recently. This is a snapshot, not a live free/busy guarantee."},
};
export function canProposeCalendarCommit(state:CalendarEvidenceState,proposedBlocks:number):boolean{
  return state==="recent"&&proposedBlocks>0;
}
export type PlannerDeadline={id:string;title:string;due_at:string;priority:number;estimated_minutes:number;calendar_synced?:boolean};
export function planningDeadlineSummary<T extends PlannerDeadline>(rows:readonly T[],now:Date){
  const clock=now.getTime();
  const ordered=[...rows].filter(row=>Number.isFinite(Date.parse(row.due_at)))
    .sort((a,b)=>Date.parse(a.due_at)-Date.parse(b.due_at)||b.priority-a.priority||a.id.localeCompare(b.id));
  const overdue=ordered.filter(row=>Date.parse(row.due_at)<clock);
  const dueSoon=ordered.filter(row=>Date.parse(row.due_at)>=clock&&Date.parse(row.due_at)<=clock+48*3600_000);
  return {
    total:rows.length,overdue:overdue.length,dueSoon:dueSoon.length,
    next:ordered[0]??null,urgent:ordered.slice(0,3),
    calendarLinked:rows.filter(row=>row.calendar_synced===true).length,
    minutesDueSoon:dueSoon.reduce((sum,row)=>sum+Math.max(0,Number(row.estimated_minutes)||0),0),
  };
}
