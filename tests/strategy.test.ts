import test from "node:test";
import assert from "node:assert/strict";
import { buildStrategyQueue, recommendStrategy, STRATEGIES, type StrategyHistory, type StrategySignal } from "../src/lib/study/strategy.ts";
import type { StudyQuestion } from "../src/lib/study/types.ts";

const signal=(overrides:Partial<StrategySignal>={}):StrategySignal=>({
  difficultySignal:"persistent",dominantError:null,weakDimension:null,paceRatio:null,recentAccuracyPercent:50,...overrides,
});
const history=(key:StrategyHistory["key"],evaluated=0,effective=0,latest:StrategyHistory["latestOutcome"]=null):StrategyHistory=>({
  key,experiments:evaluated,evaluated,effective,pending:0,effectivenessRate:evaluated?Math.round(effective/evaluated*100):null,latestOutcome:latest,
});

test("concept failures prefer concept reconstruction",()=>{
  const rec=recommendStrategy(signal({dominantError:"concept",weakDimension:"recall"}),[]);
  assert.equal(rec.recommended?.key,"concept_reconstruction");
});

test("slow execution prefers timed execution",()=>{
  const rec=recommendStrategy(signal({dominantError:"time_management",weakDimension:"execution",paceRatio:1.7}),[]);
  assert.equal(rec.recommended?.key,"timed_execution");
});

test("a method with two evaluated failures is retired and skipped",()=>{
  const rec=recommendStrategy(signal({dominantError:"concept",weakDimension:"recall"}),[
    history("concept_reconstruction",2,0,"unchanged"),
  ]);
  assert.equal(rec.statusByKey.concept_reconstruction,"retired");
  assert.notEqual(rec.recommended?.key,"concept_reconstruction");
});

test("proven transfer can outweigh a merely matching untested method",()=>{
  const rec=recommendStrategy(signal({dominantError:"method_selection",weakDimension:"recognition"}),[
    history("interleaved_transfer",2,2,"effective"),
  ]);
  assert.equal(rec.recommended?.key,"interleaved_transfer");
  assert.equal(rec.statusByKey.interleaved_transfer,"proven");
});

test("all retired methods force external support instead of endless practice",()=>{
  const histories=STRATEGIES.map((strategy)=>history(strategy.key,2,0,"unchanged"));
  const rec=recommendStrategy(signal({difficultySignal:"structural"}),histories);
  assert.equal(rec.recommended,null);
  assert.equal(rec.escalation,"external_support");
});

function question(id:string,skill:string,dimension:"recall"|"recognition"|"execution"|"transfer"|"exam",difficulty=3,minutes=4):StudyQuestion{
  return {
    id,user_id:"u",course_id:"c",primary_skill_id:skill,question_type:"problem",evidence_dimension:dimension,
    prompt:id,expected_minutes:minutes,difficulty,answer_key_or_rubric:"ok",hint_1:null,hint_2:null,active:true,
    ingestion_run_id:null,origin:"generated",source_confidence:null,version:1,created_at:"2026-01-01",updated_at:"2026-01-01",
  };
}

test("interleaved strategy samples distinct skills and obeys its budget",()=>{
  const strategy=STRATEGIES.find((x)=>x.key==="interleaved_transfer")!;
  const queue=buildStrategyQueue(strategy,[
    question("q1","s1","transfer",4,6),question("q2","s1","transfer",4,6),
    question("q3","s2","transfer",4,6),question("q4","s3","exam",4,6),
    question("q5","s4","recall",2,6),
  ],[
    {id:"s1",title:"S1",prerequisiteImportance:1},{id:"s2",title:"S2",prerequisiteImportance:1},
    {id:"s3",title:"S3",prerequisiteImportance:1},{id:"s4",title:"S4",prerequisiteImportance:1},
  ],[]);
  assert.ok(queue.reduce((sum,item)=>sum+Math.ceil(Number(item.question.expected_minutes)),0)<=strategy.budgetMinutes);
  assert.equal(new Set(queue.map((item)=>item.skillId)).size,queue.length);
  assert.ok(queue.every((item)=>item.targetDimension==="transfer"||item.targetDimension==="exam"));
});


test("pending transfer evidence blocks a second method experiment",()=>{
  const rec=recommendStrategy(signal({difficultySignal:"structural"}),[
    {key:"concept_reconstruction",experiments:1,evaluated:0,effective:0,pending:1,effectivenessRate:null,latestOutcome:"pending"},
  ]);
  assert.equal(rec.recommended,null);
  assert.equal(rec.awaitingEvidence,true);
  assert.match(rec.reason,/follow-up evidence/i);
});


test("closed inconclusive evidence does not deadlock the method portfolio",()=>{
  const rec=recommendStrategy(signal({difficultySignal:"structural"}),[
    {key:"concept_reconstruction",experiments:1,evaluated:0,effective:0,pending:1,effectivenessRate:null,latestOutcome:"insufficient_evidence"},
  ]);
  assert.equal(rec.awaitingEvidence,false);
  assert.ok(rec.recommended);
});
