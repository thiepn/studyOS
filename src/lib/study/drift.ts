import type { StudyAttemptResult, StudyIndependence } from "@/lib/supabase/database.types";

export type DriftBand="insufficient_data"|"on_track"|"watch"|"drifting"|"critical";
export type WorkloadFeedback="insufficient_data"|"stable"|"underinvested"|"low_yield"|"effective";
export type CorrectionKind="none"|"rebalance_existing"|"targeted_practice";

export type DriftAttempt={
  result:StudyAttemptResult;
  independence:StudyIndependence;
  durationSeconds:number|null;
  completedAt:string;
};

export type DriftWeek={
  weekNo:number;
  nextAction:string|null;
  healthStatus:string|null;
  unresolvedErrors:number;
};

export type DriftInput={
  currentWeek:number;
  semesterStartsOn:string;
  attempts:DriftAttempt[];
  weeks:DriftWeek[];
};

export type DriftComponent={key:string;label:string;points:number};

export type DriftProfile={
  band:DriftBand;
  score:number;
  sufficientData:boolean;
  recentWeeks:number[];
  priorWeeks:number[];
  recentIndependentAttempts:number;
  priorIndependentAttempts:number;
  recentAccuracyPercent:number|null;
  priorAccuracyPercent:number|null;
  accuracyDelta:number|null;
  recentPracticeMinutes:number;
  priorPracticeMinutes:number;
  workloadChangePercent:number|null;
  workflowLagWeeks:number;
  unresolvedErrors:number;
  workloadFeedback:WorkloadFeedback;
  components:DriftComponent[];
  priorityBoost:number;
  correctionMinutes:number;
  correctionKind:CorrectionKind;
  recommendation:string;
};

const RESULT_SCORE:Record<StudyAttemptResult,number>={incorrect:0,partial:.5,correct:1};
const ACTIONABLE=new Set(["process_material","retrieve_lecture","attempt_exercise","reconcile_solution","repair_findings","weekly_checkpoint"]);

function dayNumber(date:string){return Math.floor(Date.parse(date+"T00:00:00Z")/86_400_000);}
function weekForDate(iso:string,startsOn:string){
  const day=new Date(iso).toISOString().slice(0,10);
  return Math.floor((dayNumber(day)-dayNumber(startsOn))/7)+1;
}
function round(n:number){return Math.round(n);}
function independent(attempts:DriftAttempt[]){return attempts.filter((a)=>a.independence==="independent");}
function accuracy(attempts:DriftAttempt[]){
  const rows=independent(attempts);
  return rows.length?round(rows.reduce((sum,a)=>sum+RESULT_SCORE[a.result],0)/rows.length*100):null;
}
function practiceMinutes(attempts:DriftAttempt[]){
  return round(attempts.reduce((sum,a)=>sum+Math.max(0,Number(a.durationSeconds??0)),0)/60);
}

export function evaluateCourseDrift(input:DriftInput):DriftProfile{
  const completedWeeks=Math.max(0,input.currentWeek-1);
  const recentWeeks=completedWeeks>=1
    ? Array.from({length:Math.min(2,completedWeeks)},(_,i)=>completedWeeks-Math.min(2,completedWeeks)+1+i)
    : [];
  const priorEnd=completedWeeks-recentWeeks.length;
  const priorWeeks=priorEnd>=1
    ? Array.from({length:Math.min(2,priorEnd)},(_,i)=>priorEnd-Math.min(2,priorEnd)+1+i)
    : [];

  const withWeek=input.attempts.map((attempt)=>({attempt,weekNo:weekForDate(attempt.completedAt,input.semesterStartsOn)}));
  const recentAttempts=withWeek.filter((x)=>recentWeeks.includes(x.weekNo)).map((x)=>x.attempt);
  const priorAttempts=withWeek.filter((x)=>priorWeeks.includes(x.weekNo)).map((x)=>x.attempt);
  const recentIndependent=independent(recentAttempts);
  const priorIndependent=independent(priorAttempts);
  const recentAccuracy=accuracy(recentAttempts);
  const priorAccuracy=accuracy(priorAttempts);
  const accuracyDelta=recentAccuracy!=null&&priorAccuracy!=null?recentAccuracy-priorAccuracy:null;
  const recentMinutes=practiceMinutes(recentAttempts);
  const priorMinutes=practiceMinutes(priorAttempts);
  const workloadChange=priorMinutes>=10?round(((recentMinutes-priorMinutes)/priorMinutes)*100):null;

  const recentWeekRows=input.weeks.filter((w)=>recentWeeks.includes(Number(w.weekNo)));
  const workflowLagWeeks=recentWeekRows.filter((w)=>w.nextAction&&ACTIONABLE.has(w.nextAction)).length;
  const unresolvedErrors=recentWeekRows.reduce((sum,w)=>sum+Math.max(0,Number(w.unresolvedErrors||0)),0);
  const sufficientData=completedWeeks>=2&&(recentIndependent.length>=3||recentWeekRows.length>=2);

  const components:DriftComponent[]=[];
  const add=(key:string,label:string,points:number)=>{if(points>0)components.push({key,label,points});};

  if(workflowLagWeeks===1)add("workflow","one recent teaching week still has actionable workflow",12);
  if(workflowLagWeeks>=2)add("workflow","multiple recent teaching weeks still have actionable workflow",24);

  if(recentIndependent.length>=4&&recentAccuracy!=null&&recentAccuracy<55)add("low_accuracy","recent independent accuracy is below 55%",12);
  if(recentIndependent.length>=3&&priorIndependent.length>=3&&accuracyDelta!=null){
    if(accuracyDelta<=-15)add("accuracy_decline","independent accuracy fell at least 15 percentage points",20);
    else if(accuracyDelta<=-8)add("accuracy_decline","independent accuracy fell materially",10);
  }

  if(unresolvedErrors>=4)add("errors","recent weeks carry four or more unresolved errors",10);
  else if(unresolvedErrors>=2)add("errors","recent weeks carry repeated unresolved errors",5);

  let workloadFeedback:WorkloadFeedback="stable";
  if(!sufficientData)workloadFeedback="insufficient_data";
  else if(
    workflowLagWeeks>0&&recentMinutes<30
    || (accuracyDelta!=null&&accuracyDelta<=-8&&workloadChange!=null&&workloadChange<=-25)
  ){
    workloadFeedback="underinvested";
    add("underinvestment","effective practice time fell while outcomes/workflow weakened",10);
  }else if(
    workloadChange!=null&&workloadChange>=35&&recentMinutes>=45
    && (accuracyDelta==null||accuracyDelta<=5)
  ){
    workloadFeedback="low_yield";
    add("low_yield","practice time rose without a matching performance gain",10);
  }else if(
    accuracyDelta!=null&&accuracyDelta>=8
    && (workloadChange==null||workloadChange<=20)
  ){
    workloadFeedback="effective";
  }

  const rawScore=Math.min(100,components.reduce((sum,c)=>sum+c.points,0));
  const score=sufficientData?rawScore:0;
  let band:DriftBand="insufficient_data";
  if(sufficientData){
    if(score>=50)band="critical";
    else if(score>=30)band="drifting";
    else if(score>=15)band="watch";
    else band="on_track";
  }

  const priorityBoost=band==="critical"?14:band==="drifting"?9:band==="watch"?4:0;
  const correctionMinutes=band==="critical"?30:band==="drifting"?20:band==="watch"?15:0;

  let correctionKind:CorrectionKind="none";
  if(band==="watch"||band==="drifting"||band==="critical"){
    const performanceProblem=components.some((c)=>["low_accuracy","accuracy_decline","low_yield","errors"].includes(c.key));
    correctionKind=performanceProblem?"targeted_practice":"rebalance_existing";
  }

  let recommendation="Collect at least two completed teaching weeks before StudyOS changes allocation.";
  if(band==="on_track")recommendation=workloadFeedback==="effective"
    ?"Performance is improving without extra time. Keep the current allocation."
    :"No sustained drift is visible. Keep the current allocation and normal review cadence.";
  if(band==="watch")recommendation=correctionKind==="targeted_practice"
    ?"Use one short targeted practice block if it fits inside today’s existing capacity; do not add minutes."
    :"Give this course a mild priority increase inside the existing daily budget.";
  if(band==="drifting")recommendation=correctionKind==="targeted_practice"
    ?"Replace lower-value work with a targeted practice block and prioritize the course’s existing workflow."
    :"Rebalance today’s bounded plan toward the course until the recent workflow lag clears.";
  if(band==="critical")recommendation=correctionKind==="targeted_practice"
    ?"Reallocate existing study capacity toward targeted repair and current workflow; do not increase the total budget."
    :"Reallocate existing capacity toward clearing the sustained workflow backlog before optional work.";

  return {
    band,score,sufficientData,recentWeeks,priorWeeks,
    recentIndependentAttempts:recentIndependent.length,priorIndependentAttempts:priorIndependent.length,
    recentAccuracyPercent:recentAccuracy,priorAccuracyPercent:priorAccuracy,accuracyDelta,
    recentPracticeMinutes:recentMinutes,priorPracticeMinutes:priorMinutes,workloadChangePercent:workloadChange,
    workflowLagWeeks,unresolvedErrors,workloadFeedback,components,priorityBoost,correctionMinutes,correctionKind,recommendation,
  };
}

export function driftPriorityAdjustment(profile:DriftProfile,kind:string){
  if(kind==="commitment"||kind==="exam_strategy"||kind==="review")return 0;
  return profile.priorityBoost;
}
