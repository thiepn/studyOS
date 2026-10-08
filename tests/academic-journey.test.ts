import test from "node:test";
import assert from "node:assert/strict";
import { parseMathExpression,splitMathContent } from "../src/lib/study/math-notation.ts";
import { composeProblemWork } from "../src/lib/study/problem-work.ts";
import { canRevealRubric,assessmentReady,assessmentSourceVerified,isMasteryCreditable } from "../src/lib/study/review-state.ts";
import { isIndependentRepairEvidence } from "../src/lib/study/repair-policy.ts";
import { hasIndependentCheckpointAttempt,canOpenWeekSolutions,isCompletedWeeklyCheckpointSession,weeklyCheckpointSessionNote } from "../src/lib/study/course-study-flow.ts";

const course="550e8400-e29b-41d4-a716-446655440000";
const skill="550e8400-e29b-41d4-a716-446655440001";
const findingAt="2026-10-08T10:00:00Z";
const resultAt="2026-10-08T12:00:00Z";

test("Differentialgleichungen: solve before answer key, preserve work, classify failure, repair",()=>{
  const problem="Solve \\(y'(t)+2y(t)=0\\) with \\(y(0)=3\\).";
  const official="\\(y(t)=3e^{-2t}\\)";
  assert.ok(splitMathContent(problem).some(part=>part.kind==="math" && part.parsed));
  assert.ok(parseMathExpression("y^2+2y")!==null);
  const work=composeProblemWork("Integrating factor e^{2t}; derivative of e^{2t}y is zero","y(t)=3e^{-2t}");
  assert.ok(work.includes("Working / justification"));
  assert.ok(work.includes("Final answer / claim"));
  assert.equal(canRevealRubric(null,"typed",work),false);
  assert.equal(canRevealRubric(3,"typed",work),true);
  assert.equal(assessmentReady("incorrect",3,[]),false);
  assert.equal(assessmentReady("incorrect",3,["method_selection"]),true);
  assert.ok(splitMathContent(official).some(part=>part.kind==="math" && part.parsed));
  assert.equal(isIndependentRepairEvidence({
    skill_id:skill,result:"correct",independence:"independent",completed_at:resultAt,
  },skill,findingAt),true);
  assert.equal(isIndependentRepairEvidence({
    skill_id:skill,result:"correct",independence:"hint_1",completed_at:resultAt,
  },skill,findingAt),false);
});

test("Stochastik: rubric missing means confidence cannot manufacture positive evidence",()=>{
  const problem="Calculate \\(P(A \\mid B)=\\frac{P(A\\cap B)}{P(B)}\\).";
  assert.ok(splitMathContent(problem).some(p=>p.kind==="math" && p.parsed!==null));
  assert.equal(assessmentSourceVerified(false,false,"independent"),false);
  assert.equal(assessmentSourceVerified(false,true,"independent"),true);
  assert.equal(assessmentSourceVerified(false,false,"solution_exposed"),true);
  assert.equal(isMasteryCreditable("solution_exposed"),false);
});

test("Theoretische Informatik: partial proof with hint does not certify closed-book checkpoint",()=>{
  const work=composeProblemWork("Assume n >= 0. Induction step fails for n+1.","");
  assert.equal(canRevealRubric(2,"typed",work),true);
  assert.equal(hasIndependentCheckpointAttempt([{independence:"hint_1"},{independence:"hint_2"}]),false);
  assert.equal(hasIndependentCheckpointAttempt([{independence:"solution_exposed"}]),false);
  assert.equal(hasIndependentCheckpointAttempt([{independence:"independent"}]),true);
  // Independence records how work was done, not whether the solution was correct.
  assert.equal(assessmentReady("partial",2,["proof_structure"]),true);
});

test("AMP: exam preparation retains independent evidence even after incorrect debug attempts",()=>{
  assert.equal(assessmentReady("incorrect",1,["programming_bug"]),true);
  assert.equal(isIndependentRepairEvidence({
    skill_id:skill,result:"correct",independence:"independent",completed_at:"2026-10-08T09:00:00Z",
  },skill,findingAt),false);
  assert.equal(isIndependentRepairEvidence({
    skill_id:skill,result:"partial",independence:"independent",completed_at:resultAt,
  },skill,findingAt),false);
});

test("Course week: paper exercise before solution, then independently attempted checkpoint",()=>{
  assert.equal(canOpenWeekSolutions({exercise_count:2,exercise_attempt_completed_at:null}),false);
  assert.equal(canOpenWeekSolutions({exercise_count:2,exercise_attempt_completed_at:resultAt}),true);
  const note=weeklyCheckpointSessionNote(course,3);
  assert.equal(isCompletedWeeklyCheckpointSession({note,ended_at:resultAt},course,3),true);
  assert.equal(isCompletedWeeklyCheckpointSession({note,ended_at:null},course,3),false);
  assert.equal(isCompletedWeeklyCheckpointSession({note,ended_at:resultAt},course,4),false);
});
