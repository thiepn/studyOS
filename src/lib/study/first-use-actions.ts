import type { FirstWeekProof } from "./first-week-proof";

/** Read-only first-use guide. All inputs must come from the authenticated
 * owner's active semester and existing source-to-question-to-attempt checks.
 * Never treat recorded data as independent operator, device or release proof. */
export type FirstUseAction = {
  id:string;title:string;detail:string;label:string;href:string;state:"pending"|"recorded";
};
export type FirstUseInput = {
  courseCount:number;
  majorCourses:readonly {id:string;name:string}[];
  proofs:readonly FirstWeekProof[];
  driveConnected:boolean;driveTreeReady:boolean;
  calendarConnected:boolean;
  calendarLastSyncAt:string|null;
  calendarLastSyncStatus:string|null;
  calendarLastError:string|null;
};
const action=(id:string,title:string,detail:string,label:string,href:string,
  ready:boolean):FirstUseAction=>({id,title,detail,label,href,state:ready?"recorded":"pending"});

/** Strict bound on cached free/busy freshness: does not authorize Google writes. */
export function hasRecentCalendarEvidence(input:Pick<FirstUseInput,
  "calendarConnected"|"calendarLastSyncAt"|"calendarLastSyncStatus"|"calendarLastError">,
  nowMs:number=Date.now()):boolean {
  if(!input.calendarConnected||input.calendarLastSyncStatus!=="ok"||input.calendarLastError||
    !input.calendarLastSyncAt||!Number.isFinite(nowMs))return false;
  const timestamp=Date.parse(input.calendarLastSyncAt);
  return Number.isFinite(timestamp)&&timestamp<=nowMs&&nowMs-timestamp<=6*60*60*1000;
}

export function deriveFirstUseActions(input:FirstUseInput,nowMs:number=Date.now()){
  // Restrict the proof map to the actual current major-course roster.
  const roster=new Set(input.majorCourses.map(c=>c.id));
  const byId=new Map(input.proofs.filter(p=>roster.has(p.courseId)).map(p=>[p.courseId,p]));
  const actions:FirstUseAction[]=[
    action("roster","Actual semester course roster",
      "Create your real semester and enter the enrolled courses; no examples are inserted.",
      "Open semester setup","/semester/bootstrap",input.courseCount>0),
    action("drive","Study Drive and current-semester source folders",
      "Grant StudyOS its own Google Drive consent, then provision or adopt the current semester's folders.",
      "Review Study Drive","/resources",input.driveConnected&&input.driveTreeReady),
    action("calendar","Selected Study Calendar evidence",
      input.calendarConnected
        ?"A successful selected-calendar sync from within six hours is needed; failed and stale snapshots remain pending."
        :"Authorize StudyOS's separate Google Calendar connection; ChatGPT consent does not transfer.",
      input.calendarConnected?"Open Calendar sync controls":"Connect Study Calendar",
      input.calendarConnected?"/":"/api/integrations/google-calendar/start",
      hasRecentCalendarEvidence(input,nowMs)),
  ];
  if(!input.majorCourses.length){
    actions.push(action("major","At least one real major course",
      "Configure a major course to begin source-backed Week-1 acceptance.",
      "Add major course","/semester/bootstrap",false));
  }
  for(const course of input.majorCourses){
    const p=byId.get(course.id);
    const id=encodeURIComponent(course.id);
    const material=Boolean(p&&p.verifiedResources>0);
    const linked=Boolean(p&&p.sourceLinkedQuestions>0&&material);
    const attempted=Boolean(p&&p.independentAttempts>0&&linked);
    actions.push(action("source:"+course.id,course.name+" · verified Week-1 source",
      "Accept a real Week-1 lecture or exercise, not an unverified extraction or unrelated archive.",
      "Open source review","/resources?course="+id+"&week=1",material));
    actions.push(action("question:"+course.id,course.name+" · source-linked question",
      "Approve an active question explicitly linked to that verified Week-1 lecture or exercise.",
      "Review linked questions","/resources?course="+id+"&week=1",linked));
    actions.push(action("attempt:"+course.id,course.name+" · independent answer",
      "Record a fully independent answer on that linked question; hints and unrelated attempts do not count.",
      "Start Week-1 practice","/practice?mode=week&course="+id+"&week=1",attempted));
  }
  return {actions,completed:actions.filter(s=>s.state==="recorded").length,
    total:actions.length,next:actions.find(s=>s.state==="pending")??null};
}
