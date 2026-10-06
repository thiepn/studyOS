import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRolloverPreflight, validateNewSemester, type RolloverCourse } from "../src/lib/study/semester-rollover.ts";

const course=(state:RolloverCourse["completionState"],id=state):RolloverCourse=>({
  courseId:id,displayName:id,shortName:id,completionState:state,credits:6,
  nextExamAt:state==="retake_planned"?"2027-04-15T09:00:00Z":null,
});

test("rollover carries only explicitly planned retakes",()=>{
  const preflight=evaluateRolloverPreflight({
    active:true,openCommitments:0,futureCalendarBlocks:3,
    courses:[course("passed","dgl"),course("closed_without_pass","micro"),course("retake_planned","ti")],
  });
  assert.equal(preflight.eligible,true);
  assert.deepEqual(preflight.carryCourses.map(row=>row.courseId),["ti"]);
  assert.equal(preflight.terminalCourses,2);
  assert.equal(preflight.staleCalendarBlocks,3);
});

test("pending retake decision blocks archive instead of being copied",()=>{
  const preflight=evaluateRolloverPreflight({
    active:true,openCommitments:0,futureCalendarBlocks:0,
    courses:[course("retake_pending","ti")],
  });
  assert.equal(preflight.eligible,false);
  assert.ok(preflight.blockers.some(row=>row.code==="pending_retake_decisions"));
});

test("open real commitments block rollover",()=>{
  const preflight=evaluateRolloverPreflight({
    active:true,openCommitments:2,futureCalendarBlocks:0,courses:[course("passed")],
  });
  assert.equal(preflight.eligible,false);
  assert.ok(preflight.blockers.some(row=>row.code==="open_commitments"));
});

test("stale calendar blocks are cleanup work, not carry-forward blockers",()=>{
  const preflight=evaluateRolloverPreflight({
    active:true,openCommitments:0,futureCalendarBlocks:5,courses:[course("passed")],
  });
  assert.equal(preflight.eligible,true);
  assert.equal(preflight.staleCalendarBlocks,5);
});

test("missing/provisional outcomes prevent archival finality",()=>{
  for(const state of ["provisional_result","awaiting_result","ongoing","inactive_unresolved"] as const){
    const preflight=evaluateRolloverPreflight({
      active:true,openCommitments:0,futureCalendarBlocks:0,courses:[course(state)],
    });
    assert.equal(preflight.eligible,false,state);
  }
});

test("new semester validation rejects invalid keys and date order",()=>{
  assert.ok(validateNewSemester({stableKey:"SS 27",displayName:"SS27",startsOn:"2027-04-01",endsOn:null,timezone:"Europe/Berlin"}));
  assert.ok(validateNewSemester({stableKey:"ss27",displayName:"SS27",startsOn:"2027-10-01",endsOn:"2027-04-01",timezone:"Europe/Berlin"}));
  assert.equal(validateNewSemester({stableKey:"ss27",displayName:"SS27",startsOn:"2027-04-01",endsOn:"2027-09-30",timezone:"Europe/Berlin"}),null);
});
