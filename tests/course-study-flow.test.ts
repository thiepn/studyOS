import test from "node:test";
import assert from "node:assert/strict";
import { canOpenWeekSolutions, isCompletedWeeklyCheckpointSession, parseTeachingWeek, weeklyCheckpointSessionNote } from "../src/lib/study/course-study-flow.ts";

test("solution link gate follows recorded independent attempt",()=>{
  assert.equal(canOpenWeekSolutions({exercise_count:1,exercise_attempt_completed_at:null}),false);
  assert.equal(canOpenWeekSolutions({exercise_count:1,exercise_attempt_completed_at:"2026-10-08T08:00:00Z"}),true);
  assert.equal(canOpenWeekSolutions({exercise_count:0,exercise_attempt_completed_at:null}),true);
});

test("weekly checkpoint evidence is attached to exact course and week",()=>{
  const course="913de6d1-84a5-4c3a-944a-38b1e3aebf83";
  const session={note:"Finished · "+weeklyCheckpointSessionNote(course,3),ended_at:"2026-10-08T09:30:00Z"};
  assert.equal(isCompletedWeeklyCheckpointSession(session,course,3),true);
  assert.equal(isCompletedWeeklyCheckpointSession(session,course,4),false);
  assert.equal(isCompletedWeeklyCheckpointSession(session,"another-course",3),false);
  assert.equal(isCompletedWeeklyCheckpointSession({...session,ended_at:null},course,3),false);
});

test("course teaching-week query only accepts valid weeks",()=>{
  assert.equal(parseTeachingWeek("1"),1);
  assert.equal(parseTeachingWeek("40"),40);
  for (const value of ["0","41","-1","3.5","01","3x","",null,undefined]) assert.equal(parseTeachingWeek(value),null);
});
