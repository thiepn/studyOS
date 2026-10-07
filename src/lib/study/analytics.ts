import type { StudyAttemptResult, StudyIndependence } from "@/lib/supabase/database.types";
import { evaluateCourseDrift, type DriftAttempt, type DriftProfile, type DriftWeek } from "./drift.ts";

export type InterventionOutcome="pending"|"insufficient_evidence"|"effective"|"unchanged"|"regressed";
export type DifficultySignal="insufficient_evidence"|"transient"|"responsive"|"persistent"|"structural";

export type AnalyticsAttempt={
  sessionId:string|null;
  result:StudyAttemptResult;
  independence:StudyIndependence;
  durationSeconds:number|null;
  completedAt:string;
};

export type InterventionSession={
  id:string;
  startedAt:string;
  endedAt:string|null;
  plannedMinutes:number|null;
  actualMinutes:number|null;
};

export type InterventionEvaluation={
  sessionId:string;
  interventionWeek:number;
  plannedMinutes:number|null;
  actualMinutes:number|null;
  baselineAttempts:number;
  followupAttempts:number;
  baselineAccuracyPercent:number|null;
  followupAccuracyPercent:number|null;
  accuracyDelta:number|null;
  outcome:InterventionOutcome;
  evidenceWindow:string;
};

export type CourseLearningAnalytics={
  latestDrift:DriftProfile;
  interventions:InterventionEvaluation[];
  totalInterventions:number;
  evaluatedInterventions:number;
  effectiveInterventions:number;
  pendingInterventions:number;
  effectivenessRate:number|null;
  difficultySignal:DifficultySignal;
  recommendation:string;
};

export type SemesterLearningSummary={
  totalInterventions:number;
  evaluatedInterventions:number;
  effectiveInterventions:number;
  pendingInterventions:number;
  effectivenessRate:number|null;
  persistentCourses:number;
  structuralCourses:number;
};

const RESULT_SCORE:Record<StudyAttemptResult,number>={incorrect:0,partial:.5,correct:1};

function dayNumber(date:string){return Math.floor(Date.parse(date+"T00:00:00Z")/86_400_000);}
function weekForDate(iso:string,startsOn:string){
  const day=new Date(iso).toISOString().slice(0,10);
  return Math.floor((dayNumber(day)-dayNumber(startsOn))/7)+1;
}
function independent(rows:AnalyticsAttempt[]){
  return rows.filter((row)=>row.independence==="independent");
}
function accuracy(rows:AnalyticsAttempt[]){
  const sample=independent(rows);
  return sample.length?Math.round(sample.reduce((sum,row)=>sum+RESULT_SCORE[row.result],0)/sample.length*100):null;
}

export function evaluateIntervention(
  session:InterventionSession,
  attempts:AnalyticsAttempt[],
  currentWeek:number,
  semesterStartsOn:string,
  interventionSessionIds:Set<string>=new Set([session.id]),
):InterventionEvaluation{
  const interventionWeek=weekForDate(session.startedAt,semesterStartsOn);
  const completedWeek=Math.max(0,currentWeek-1);
  const baselineWeeks=[interventionWeek-2,interventionWeek-1].filter((week)=>week>=1);
  const followupWeeks=[interventionWeek+1,interventionWeek+2].filter((week)=>week<=completedWeek);

  const mapped=attempts.map((attempt)=>({attempt,weekNo:weekForDate(attempt.completedAt,semesterStartsOn)}));
  const baseline=mapped
    .filter((row)=>baselineWeeks.includes(row.weekNo)&&(!row.attempt.sessionId||!interventionSessionIds.has(row.attempt.sessionId)))
    .map((row)=>row.attempt);
  const followup=mapped
    .filter((row)=>followupWeeks.includes(row.weekNo)&&(!row.attempt.sessionId||!interventionSessionIds.has(row.attempt.sessionId)))
    .map((row)=>row.attempt);
  const baselineIndependent=independent(baseline);
  const followupIndependent=independent(followup);
  const baselineAccuracy=accuracy(baseline);
  const followupAccuracy=accuracy(followup);
  const accuracyDelta=baselineAccuracy!=null&&followupAccuracy!=null?followupAccuracy-baselineAccuracy:null;

  let outcome:InterventionOutcome="pending";
  if(!session.endedAt||completedWeek<interventionWeek+1)outcome="pending";
  else if(baselineIndependent.length<3||followupIndependent.length<3)outcome="insufficient_evidence";
  else if(accuracyDelta!=null&&accuracyDelta>=10)outcome="effective";
  else if(accuracyDelta!=null&&accuracyDelta<=-10)outcome="regressed";
  else outcome="unchanged";

  return {
    sessionId:session.id,interventionWeek,plannedMinutes:session.plannedMinutes,actualMinutes:session.actualMinutes,
    baselineAttempts:baselineIndependent.length,followupAttempts:followupIndependent.length,
    baselineAccuracyPercent:baselineAccuracy,followupAccuracyPercent:followupAccuracy,accuracyDelta,
    outcome,evidenceWindow:`W${Math.max(1,interventionWeek-2)}–${Math.max(1,interventionWeek-1)} → intervention W${interventionWeek} → W${interventionWeek+1}–${interventionWeek+2}`,
  };
}

export function buildCourseLearningAnalytics(input:{
  currentWeek:number;
  semesterStartsOn:string;
  attempts:AnalyticsAttempt[];
  interventions:InterventionSession[];
  driftAttempts:DriftAttempt[];
  driftWeeks:DriftWeek[];
}):CourseLearningAnalytics{
  const latestDrift=evaluateCourseDrift({
    currentWeek:input.currentWeek,semesterStartsOn:input.semesterStartsOn,
    attempts:input.driftAttempts,weeks:input.driftWeeks,
  });
  const completedInterventions=input.interventions.filter((session)=>session.endedAt);
  const interventionSessionIds=new Set(completedInterventions.map((session)=>session.id));
  const interventions=completedInterventions
    .map((session)=>evaluateIntervention(session,input.attempts,input.currentWeek,input.semesterStartsOn,interventionSessionIds))
    .sort((a,b)=>b.interventionWeek-a.interventionWeek);

  const evaluated=interventions.filter((item)=>["effective","unchanged","regressed"].includes(item.outcome));
  const effective=evaluated.filter((item)=>item.outcome==="effective");
  const failed=evaluated.filter((item)=>item.outcome==="unchanged"||item.outcome==="regressed");
  const pending=interventions.filter((item)=>item.outcome==="pending"||item.outcome==="insufficient_evidence");
  const effectivenessRate=evaluated.length?Math.round(effective.length/evaluated.length*100):null;
  const latestEvaluated=evaluated[0]??null;

  let difficultySignal:DifficultySignal="insufficient_evidence";
  if(evaluated.length>=3
    && effectivenessRate!=null&&effectivenessRate<=33
    && ["drifting","critical"].includes(latestDrift.band)
    && latestDrift.workloadFeedback!=="underinvested"
    && (latestDrift.recentAccuracyPercent==null||latestDrift.recentAccuracyPercent<65)
  ) difficultySignal="structural";
  else if(evaluated.length>=2&&failed.length>=2&&effectivenessRate!=null&&effectivenessRate<50) difficultySignal="persistent";
  else if(evaluated.length>=2&&effectivenessRate!=null&&effectivenessRate>=50) difficultySignal="responsive";
  else if(latestEvaluated?.outcome==="effective"&&latestDrift.band==="on_track") difficultySignal="transient";

  let recommendation="Complete a targeted drift-repair session and collect independent follow-up evidence before judging intervention effectiveness.";
  if(difficultySignal==="transient")recommendation="The correction worked and the course returned on track. Treat the episode as temporary unless drift recurs.";
  if(difficultySignal==="responsive")recommendation="Targeted corrections are usually improving later performance. Reuse the same correction pattern when similar drift returns.";
  if(difficultySignal==="persistent")recommendation="Repeated corrections are not reliably improving later performance. Do not repeat the same repair pattern blindly; inspect the error pattern and study method.";
  if(difficultySignal==="structural")recommendation="Repeated corrections have failed despite adequate effort and sustained drift. Treat this as a structural course difficulty signal: change method, representation, or external support rather than adding more minutes.";

  return {
    latestDrift,interventions,totalInterventions:interventions.length,evaluatedInterventions:evaluated.length,
    effectiveInterventions:effective.length,pendingInterventions:pending.length,effectivenessRate,difficultySignal,recommendation,
  };
}

export function summarizeSemesterAnalytics(courses:CourseLearningAnalytics[]):SemesterLearningSummary{
  const totalInterventions=courses.reduce((sum,course)=>sum+course.totalInterventions,0);
  const evaluatedInterventions=courses.reduce((sum,course)=>sum+course.evaluatedInterventions,0);
  const effectiveInterventions=courses.reduce((sum,course)=>sum+course.effectiveInterventions,0);
  const pendingInterventions=courses.reduce((sum,course)=>sum+course.pendingInterventions,0);
  return {
    totalInterventions,evaluatedInterventions,effectiveInterventions,pendingInterventions,
    effectivenessRate:evaluatedInterventions?Math.round(effectiveInterventions/evaluatedInterventions*100):null,
    persistentCourses:courses.filter((course)=>course.difficultySignal==="persistent").length,
    structuralCourses:courses.filter((course)=>course.difficultySignal==="structural").length,
  };
}
