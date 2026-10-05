import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCourseDrift, driftPriorityAdjustment, type DriftAttempt, type DriftWeek } from "../src/lib/study/drift.ts";

const starts="2026-09-01";
const at=(week:number,day=2)=>new Date(Date.parse(starts+"T12:00:00Z")+(week-1)*7*86400000+day*86400000).toISOString();
const attempt=(week:number,result:"correct"|"partial"|"incorrect"="correct",minutes=4):DriftAttempt=>({
  result,independence:"independent",durationSeconds:minutes*60,completedAt:at(week),
});
const week=(weekNo:number,nextAction:string|null="maintain",errors=0):DriftWeek=>({weekNo,nextAction,healthStatus:"learning",unresolvedErrors:errors});

test("does not call current-week incompleteness drift",()=>{
  const p=evaluateCourseDrift({currentWeek:2,semesterStartsOn:starts,attempts:[attempt(1)],weeks:[week(1)]});
  assert.equal(p.band,"insufficient_data");
  assert.equal(p.priorityBoost,0);
});

test("stable completed weeks remain on track",()=>{
  const attempts=[
    attempt(1),attempt(1),attempt(2),attempt(2),
    attempt(3),attempt(3),attempt(4),attempt(4),
  ];
  const p=evaluateCourseDrift({currentWeek:5,semesterStartsOn:starts,attempts,weeks:[week(1),week(2),week(3),week(4)]});
  assert.equal(p.band,"on_track");
  assert.equal(p.score,0);
});

test("falling effort plus falling performance and workflow lag is sustained drift",()=>{
  const attempts=[
    attempt(1,"correct",8),attempt(1,"correct",8),attempt(2,"correct",8),attempt(2,"correct",8),
    attempt(3,"incorrect",3),attempt(3,"partial",3),attempt(4,"incorrect",3),attempt(4,"partial",3),
  ];
  const p=evaluateCourseDrift({
    currentWeek:5,semesterStartsOn:starts,attempts,
    weeks:[week(1),week(2),week(3,"attempt_exercise",2),week(4,"reconcile_solution",2)],
  });
  assert.ok(["drifting","critical"].includes(p.band));
  assert.equal(p.workloadFeedback,"underinvested");
  assert.ok(p.priorityBoost>0);
  assert.ok(p.components.some((c)=>c.key==="accuracy_decline"));
});

test("more effort without performance improvement is flagged as low yield",()=>{
  const attempts=[
    attempt(1,"correct",3),attempt(1,"incorrect",3),attempt(2,"correct",3),attempt(2,"incorrect",3),
    attempt(3,"correct",8),attempt(3,"incorrect",8),attempt(4,"correct",8),attempt(4,"incorrect",8),
  ];
  const p=evaluateCourseDrift({currentWeek:5,semesterStartsOn:starts,attempts,weeks:[week(1),week(2),week(3),week(4)]});
  assert.equal(p.workloadFeedback,"low_yield");
  assert.equal(p.correctionKind,"targeted_practice");
});

test("drift never boosts deadlines, exam strategy, review, or total capacity itself",()=>{
  const p=evaluateCourseDrift({
    currentWeek:5,semesterStartsOn:starts,
    attempts:[attempt(1),attempt(1),attempt(2),attempt(2),attempt(3,"incorrect"),attempt(3,"incorrect"),attempt(4,"incorrect"),attempt(4,"incorrect")],
    weeks:[week(1),week(2),week(3,"repair_findings",3),week(4,"repair_findings",3)],
  });
  assert.equal(driftPriorityAdjustment(p,"commitment"),0);
  assert.equal(driftPriorityAdjustment(p,"exam_strategy"),0);
  assert.equal(driftPriorityAdjustment(p,"review"),0);
  assert.equal(driftPriorityAdjustment(p,"workflow"),p.priorityBoost);
});
