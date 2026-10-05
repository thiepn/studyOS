import test from "node:test";
import assert from "node:assert/strict";
import { buildCalibrationProfile, buildCalibrationQueue, type CalibrationAttempt } from "../src/lib/study/calibration.ts";
import type { StudyQuestion } from "../src/lib/study/types.ts";

const attempt=(n:number,overrides:Partial<CalibrationAttempt>={}):CalibrationAttempt=>({
  courseId:"c",skillId:"s"+((n%4)+1),questionId:"q"+n,evidenceDimension:n%2?"execution":"recognition",
  result:"correct",independence:"independent",selfConfidence:4,durationSeconds:180,expectedMinutes:3,errorTypes:[],completedAt:new Date(n*1000).toISOString(),...overrides,
});
const q=(id:string,skill:string,dimension:StudyQuestion["evidence_dimension"],minutes=3,difficulty=3):StudyQuestion=>({
  id,user_id:"u",course_id:"c",primary_skill_id:skill,question_type:"short_application",evidence_dimension:dimension,
  prompt:id,answer_key_or_rubric:"answer",hint_1:null,hint_2:null,difficulty,expected_minutes:minutes,source_confidence:1,
  origin:"generated",active:true,ingestion_run_id:null,version:1,created_at:"",updated_at:"",
});

test("early evidence stays broad and uncalibrated",()=>{
  const p=buildCalibrationProfile([attempt(1),attempt(2),attempt(3)]);
  assert.equal(p.status,"uncalibrated");
  assert.equal(p.needsCalibration,true);
  assert.match(p.recommendation,/sampling broadly/i);
});

test("usable evidence detects confidence and recurring error signal",()=>{
  const attempts=Array.from({length:8},(_,i)=>attempt(i,{
    result:i<4?"incorrect":"correct",
    selfConfidence:5,
    evidenceDimension:i<4?"execution":"recognition",
    errorTypes:i<4?["method_selection"]:[],
  }));
  const p=buildCalibrationProfile(attempts);
  assert.equal(p.status,"usable");
  assert.equal(p.accuracyPercent,50);
  assert.ok((p.confidenceGap??0)>=40);
  assert.equal(p.weakDimension,"execution");
  assert.equal(p.dominantError,"method_selection");
});

test("calibration queue samples distinct skills before repeating",()=>{
  const skills=new Map([["s1","One"],["s2","Two"],["s3","Three"]]);
  const queue=buildCalibrationQueue([
    q("q1","s1","execution"),q("q2","s1","recognition"),q("q3","s2","execution"),q("q4","s3","recognition"),
  ],skills,[],12,4);
  assert.equal(queue.length,3);
  assert.equal(new Set(queue.map((x)=>x.skillId)).size,3);
});

test("calibration queue obeys the hard session budget",()=>{
  const skills=new Map([["s1","One"],["s2","Two"]]);
  const queue=buildCalibrationQueue([q("q1","s1","execution",12),q("q2","s2","execution",12)],skills,[],20,5);
  assert.equal(queue.length,1);
});
