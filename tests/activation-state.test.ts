import test from "node:test";
import assert from "node:assert/strict";
import { evaluateActivation, type ActivationSnapshot, type PlatformActivation } from "../src/lib/study/activation-state.ts";
import type { FirstWeekProof } from "../src/lib/study/first-week-proof.ts";

const platform:PlatformActivation={secureOrigin:true,hasSupabaseSecret:true,googleDriveConfigured:true,googleCalendarConfigured:true};
const snapshot:ActivationSnapshot={
  course_count:6,major_course_count:4,retake_course_count:2,bootstrap_certified:true,drive_connected:true,drive_tree_ready:true,
  calendar_connected:true,calendar_synced:true,majors_with_timetable:4,retake_baselines_completed:2,
  majors_with_week1_material:4,majors_with_study_map:4,majors_with_attempts:4,
};
const majorIds=["dgl","stoch","ti","amp"];
const proofs:FirstWeekProof[]=majorIds.map(courseId=>({
  courseId,verifiedResources:1,sourceLinkedQuestions:1,independentAttempts:1,
}));
const evaluate=(s:ActivationSnapshot=snapshot,p:PlatformActivation=platform,ids=majorIds,rows=proofs)=>
  evaluateActivation(p,s,ids,rows);

test("fully sourced independent first-week work certifies all three layers",()=>{
  const result=evaluate();
  assert.equal(result.platformReady,true);
  assert.equal(result.preSemesterReady,true);
  assert.equal(result.firstWeekCertified,true);
  assert.equal(result.platformPercent,100);
  assert.equal(result.activationPercent,100);
  assert.equal(result.firstWeekPercent,100);
});
test("platform readiness does not imply personal activation",()=>{
  const result=evaluate({...snapshot,drive_connected:false,drive_tree_ready:false,calendar_connected:false,calendar_synced:false,
    majors_with_timetable:0,retake_baselines_completed:0});
  assert.equal(result.platformReady,true);
  assert.equal(result.preSemesterReady,false);
  assert.equal(result.firstWeekCertified,false);
  assert.ok(result.activationBlockers.some(s=>s.includes("Study Drive")));
});
test("course activity counters alone never certify a semester",()=>{
  const result=evaluateActivation(platform,snapshot);
  assert.equal(result.preSemesterReady,true);
  assert.equal(result.firstWeekCertified,false);
  assert.equal(result.firstWeekPercent,25); // Only the roster exists; zero source, question or attempt proof.
});
test("a missing approved Week-1 source blocks academic certification",()=>{
  const result=evaluate(snapshot,platform,majorIds,proofs.map((row,i)=>i===0?{...row,verifiedResources:0,sourceLinkedQuestions:0,independentAttempts:0}:row));
  assert.equal(result.firstWeekCertified,false);
  assert.ok(result.firstWeekBlockers.some(x=>x.includes("verified Week-1")));
});
test("a source without a linked, approved question cannot count as complete",()=>{
  const result=evaluate(snapshot,platform,majorIds,proofs.map((row,i)=>i===1?{...row,sourceLinkedQuestions:0,independentAttempts:0}:row));
  assert.equal(result.firstWeekCertified,false);
  assert.ok(result.firstWeekBlockers.some(x=>x.includes("linked to verified")));
});
test("four old course attempts cannot replace a source-linked independent attempt",()=>{
  const result=evaluate(snapshot,platform,majorIds,proofs.map((row,i)=>i===2?{...row,independentAttempts:0}:row));
  assert.equal(result.firstWeekCertified,false);
  assert.ok(result.firstWeekBlockers.some(x=>x.includes("fully independent")));
});
test("OAuth configuration is a separate platform gate",()=>{
  const result=evaluate(snapshot,{...platform,googleCalendarConfigured:false});
  assert.equal(result.platformReady,false);
  assert.equal(result.preSemesterReady,false);
  assert.equal(result.firstWeekCertified,false);
});
test("any legitimate major roster size can qualify after provenance checks",()=>{
  const small={...snapshot,course_count:3,major_course_count:2,retake_course_count:1,
    majors_with_timetable:2,retake_baselines_completed:1,
    majors_with_week1_material:2,majors_with_study_map:2,majors_with_attempts:2};
  assert.equal(evaluate(small,platform,majorIds.slice(0,2),proofs.slice(0,2)).firstWeekCertified,true);
});
test("retake-only semesters can activate but cannot claim a certified major first-week loop",()=>{
  const retakeOnly={...snapshot,course_count:1,major_course_count:0,retake_course_count:1,
    majors_with_timetable:0,retake_baselines_completed:1,
    majors_with_week1_material:0,majors_with_study_map:0,majors_with_attempts:0};
  const result=evaluate(retakeOnly,platform,[],[]);
  assert.equal(result.preSemesterReady,true);
  assert.equal(result.firstWeekCertified,false);
});
test("unconfirmed semester setup cannot pass activation",()=>{
  const result=evaluate({...snapshot,bootstrap_certified:false});
  assert.equal(result.preSemesterReady,false);
  assert.ok(result.activationBlockers.some(item=>item.includes("semester setup")));
});
