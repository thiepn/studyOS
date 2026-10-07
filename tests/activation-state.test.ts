import test from "node:test";
import assert from "node:assert/strict";
import { evaluateActivation, type ActivationSnapshot, type PlatformActivation } from "../src/lib/study/activation-state.ts";

const platform:PlatformActivation={secureOrigin:true,hasSupabaseSecret:true,googleDriveConfigured:true,googleCalendarConfigured:true};
const snapshot:ActivationSnapshot={
  course_count:6,major_course_count:4,retake_course_count:2,bootstrap_certified:true,drive_connected:true,drive_tree_ready:true,
  calendar_connected:true,calendar_synced:true,majors_with_timetable:4,retake_baselines_completed:2,
  majors_with_week1_material:4,majors_with_study_map:4,majors_with_attempts:4,
};

test("full real semester loop certifies all three layers",()=>{
  const result=evaluateActivation(platform,snapshot);
  assert.equal(result.platformReady,true);assert.equal(result.preSemesterReady,true);assert.equal(result.firstWeekCertified,true);
  assert.equal(result.platformPercent,100);assert.equal(result.activationPercent,100);assert.equal(result.firstWeekPercent,100);
});

test("platform readiness does not imply personal activation",()=>{
  const result=evaluateActivation(platform,{...snapshot,drive_connected:false,drive_tree_ready:false,calendar_connected:false,calendar_synced:false,majors_with_timetable:0,retake_baselines_completed:0});
  assert.equal(result.platformReady,true);assert.equal(result.preSemesterReady,false);assert.equal(result.firstWeekCertified,false);
  assert.ok(result.activationBlockers.some(x=>x.includes("Study Drive")));
});

test("pre-semester activation does not imply first-week certification",()=>{
  const result=evaluateActivation(platform,{...snapshot,majors_with_week1_material:0,majors_with_study_map:0,majors_with_attempts:0});
  assert.equal(result.preSemesterReady,true);assert.equal(result.firstWeekCertified,false);assert.equal(result.firstWeekPercent,0);
});

test("one missing major keeps first-week certification blocked",()=>{
  const result=evaluateActivation(platform,{...snapshot,majors_with_week1_material:3,majors_with_study_map:4,majors_with_attempts:4});
  assert.equal(result.firstWeekCertified,false);
  assert.deepEqual(result.firstWeekBlockers,["Process at least one verified Week-1 source for every major course."]);
});

test("deployment OAuth configuration is a separate platform gate",()=>{
  const result=evaluateActivation({...platform,googleCalendarConfigured:false},snapshot);
  assert.equal(result.platformReady,false);assert.equal(result.preSemesterReady,false);assert.equal(result.firstWeekCertified,false);
});


test("activation supports arbitrary active-semester roster sizes",()=>{
  const result=evaluateActivation(platform,{
    ...snapshot,course_count:3,major_course_count:2,retake_course_count:1,
    majors_with_timetable:2,retake_baselines_completed:1,
    majors_with_week1_material:2,majors_with_study_map:2,majors_with_attempts:2,
  });
  assert.equal(result.preSemesterReady,true);
  assert.equal(result.firstWeekCertified,true);
});

test("retake-only semester does not require nonexistent major evidence",()=>{
  const result=evaluateActivation(platform,{
    ...snapshot,course_count:1,major_course_count:0,retake_course_count:1,
    majors_with_timetable:0,retake_baselines_completed:1,
    majors_with_week1_material:0,majors_with_study_map:0,majors_with_attempts:0,
  });
  assert.equal(result.preSemesterReady,true);
  assert.equal(result.firstWeekCertified,true);
});


test("unconfirmed semester setup cannot pass activation",()=>{
  const result=evaluateActivation(platform,{...snapshot,bootstrap_certified:false});
  assert.equal(result.preSemesterReady,false);
  assert.ok(result.activationBlockers.some(item=>item.includes("semester setup")));
});
