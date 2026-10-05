import test from "node:test";
import assert from "node:assert/strict";
import { buildCourseLearningAnalytics, evaluateIntervention, summarizeSemesterAnalytics, type AnalyticsAttempt, type InterventionSession } from "../src/lib/study/analytics.ts";
import type { DriftAttempt, DriftWeek } from "../src/lib/study/drift.ts";

const starts="2026-09-01";
const at=(week:number,day=2)=>new Date(Date.parse(starts+"T12:00:00Z")+(week-1)*7*86400000+day*86400000).toISOString();
const attempt=(week:number,result:"correct"|"partial"|"incorrect",sessionId:string|null=null,minutes=4):AnalyticsAttempt=>({
  sessionId,result,independence:"independent",durationSeconds:minutes*60,completedAt:at(week),
});
const intervention=(week:number,id="i1"):InterventionSession=>({
  id,startedAt:at(week),endedAt:at(week,3),plannedMinutes:20,actualMinutes:18,
});
const driftAttempts=(rows:AnalyticsAttempt[]):DriftAttempt[]=>rows.map((row)=>({
  result:row.result,independence:row.independence,durationSeconds:row.durationSeconds,completedAt:row.completedAt,
}));
const weeks=(through:number,nextAction:string|null="maintain"):DriftWeek[]=>Array.from({length:through},(_,i)=>({
  weekNo:i+1,nextAction,healthStatus:"learning",unresolvedErrors:0,
}));

test("intervention requires independent evidence on both sides",()=>{
  const result=evaluateIntervention(intervention(3),[
    attempt(1,"incorrect"),attempt(2,"incorrect"),attempt(2,"partial"),
    attempt(4,"correct"),attempt(4,"correct"),
  ],6,starts);
  assert.equal(result.outcome,"insufficient_evidence");
});

test("intervention is effective only from later evidence, excluding its own session",()=>{
  const rows=[
    attempt(1,"incorrect"),attempt(1,"partial"),attempt(2,"incorrect"),attempt(2,"partial"),
    attempt(3,"correct","i1"),
    attempt(4,"correct"),attempt(4,"correct"),attempt(5,"partial"),attempt(5,"correct"),
  ];
  const result=evaluateIntervention(intervention(3),rows,6,starts);
  assert.equal(result.outcome,"effective");
  assert.ok(Number(result.accuracyDelta)>=10);
  assert.equal(result.followupAttempts,4);
});

test("repeated failed corrections with sustained drift can become structural",()=>{
  const rows:AnalyticsAttempt[]=[
    attempt(1,"correct"),attempt(1,"correct"),attempt(2,"correct"),attempt(2,"partial"),
    attempt(3,"incorrect","i1"),
    attempt(4,"incorrect"),attempt(4,"partial"),attempt(4,"incorrect"),
    attempt(5,"incorrect","i2"),
    attempt(6,"incorrect"),attempt(6,"partial"),attempt(6,"incorrect"),
    attempt(7,"incorrect","i3"),
    attempt(8,"incorrect",null,6),attempt(8,"partial",null,6),attempt(8,"incorrect",null,6),
    attempt(9,"incorrect",null,6),attempt(9,"partial",null,6),attempt(9,"incorrect",null,6),
  ];
  const course=buildCourseLearningAnalytics({
    currentWeek:10,semesterStartsOn:starts,attempts:rows,
    interventions:[intervention(3,"i1"),intervention(5,"i2"),intervention(7,"i3")],
    driftAttempts:driftAttempts(rows),
    driftWeeks:weeks(9,"repair_findings").map((row)=>({...row,unresolvedErrors:2})),
  });
  assert.equal(course.evaluatedInterventions,3);
  assert.equal(course.effectiveInterventions,0);
  assert.equal(course.difficultySignal,"structural");
});

test("successful corrections are classified as responsive rather than structural",()=>{
  const rows:AnalyticsAttempt[]=[
    attempt(1,"incorrect"),attempt(1,"partial"),attempt(2,"incorrect"),attempt(2,"partial"),
    attempt(3,"correct","i1"),
    attempt(4,"correct"),attempt(4,"correct"),attempt(4,"partial"),
    attempt(5,"incorrect","i2"),
    attempt(6,"correct"),attempt(6,"correct"),attempt(6,"correct"),
    attempt(7,"correct"),attempt(7,"correct"),attempt(8,"correct"),attempt(8,"correct"),
  ];
  const course=buildCourseLearningAnalytics({
    currentWeek:9,semesterStartsOn:starts,attempts:rows,
    interventions:[intervention(3,"i1"),intervention(5,"i2")],
    driftAttempts:driftAttempts(rows),driftWeeks:weeks(8),
  });
  assert.equal(course.effectiveInterventions,2);
  assert.equal(course.difficultySignal,"responsive");
});

test("semester summary reports effectiveness and structural course counts",()=>{
  const empty=buildCourseLearningAnalytics({currentWeek:2,semesterStartsOn:starts,attempts:[],interventions:[],driftAttempts:[],driftWeeks:[]});
  const responsive={...empty,totalInterventions:2,evaluatedInterventions:2,effectiveInterventions:1,pendingInterventions:0,effectivenessRate:50,difficultySignal:"responsive" as const};
  const structural={...empty,totalInterventions:3,evaluatedInterventions:3,effectiveInterventions:0,pendingInterventions:0,effectivenessRate:0,difficultySignal:"structural" as const};
  const summary=summarizeSemesterAnalytics([responsive,structural]);
  assert.equal(summary.totalInterventions,5);
  assert.equal(summary.effectivenessRate,20);
  assert.equal(summary.structuralCourses,1);
});


test("other repair sessions never count as transfer evidence",()=>{
  const rows=[
    attempt(1,"incorrect"),attempt(1,"partial"),attempt(2,"incorrect"),
    attempt(3,"correct","i1"),
    attempt(4,"correct","i2"),attempt(4,"correct","i2"),attempt(4,"correct","i2"),
  ];
  const result=evaluateIntervention(intervention(3,"i1"),rows,6,starts,new Set(["i1","i2"]));
  assert.equal(result.followupAttempts,0);
  assert.equal(result.outcome,"insufficient_evidence");
});
