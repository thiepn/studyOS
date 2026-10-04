import test from "node:test";
import assert from "node:assert/strict";
import { buildCheckpointQueue, type CheckpointSkill } from "../src/lib/study/checkpoint.ts";

function skill(overrides: Partial<CheckpointSkill>): CheckpointSkill {
  return {
    skill_id: "skill-"+Math.random(),
    course_id: "course",
    skill_title: "Skill",
    first_week_no: 1,
    required_dimensions: ["recognition","execution"],
    exam_importance: 3,
    prerequisite_importance: 3,
    mastery_state: "stable",
    retention_state: "maintained",
    retention_pressure: 5,
    recent_lapse: false,
    evidence_floor: 0.7,
    recall_evidence: 0.7,
    recognition_evidence: 0.7,
    execution_evidence: 0.7,
    transfer_evidence: 0.4,
    exam_evidence: 0.2,
    ...overrides,
  };
}

function question(id:string, skillId:string, minutes:number, dimension:"recall"|"recognition"|"execution"|"transfer"|"exam", type="problem") {
  return {
    id, user_id:"u", course_id:"course", primary_skill_id:skillId,
    question_type:type, evidence_dimension:dimension, prompt:id, answer_key_or_rubric:"rubric",
    difficulty:3, expected_minutes:minutes, source_confidence:1, origin:"generated",
    active:true, version:1, created_at:"", updated_at:"", hint_1:null, hint_2:null, ingestion_run_id:null,
  } as any;
}

test("checkpoint reserves early budget for genuinely older material", () => {
  const old=skill({skill_id:"old",skill_title:"Old",first_week_no:1,retention_pressure:1,exam_importance:1,prerequisite_importance:1});
  const recent=skill({skill_id:"recent",skill_title:"Recent",first_week_no:5,retention_pressure:90,exam_importance:5,prerequisite_importance:5});
  const queue=buildCheckpointQueue([old,recent],[question("q-old","old",20,"execution"),question("q-recent","recent",20,"execution")],5,20);
  assert.equal(queue.length,1);
  assert.equal(queue[0].skillId,"old");
});

test("relearning targets the actual weakest required evidence dimension", () => {
  const weak=skill({skill_id:"weak",retention_state:"relearning",recognition_evidence:0.8,execution_evidence:0.2});
  const queue=buildCheckpointQueue([weak],[question("q-rec","weak",5,"recognition"),question("q-exe","weak",5,"execution")],4,10);
  assert.equal(queue[0].targetDimension,"execution");
  assert.equal(queue[0].question.id,"q-exe");
});

test("checkpoint never exceeds its fixed budget", () => {
  const skills=[1,2,3].map((n)=>skill({skill_id:"s"+n,first_week_no:1,retention_pressure:30+n}));
  const questions=skills.map((s,n)=>question("q"+n,s.skill_id,25,"execution"));
  const queue=buildCheckpointQueue(skills,questions,6,60);
  const minutes=queue.reduce((sum,item)=>sum+Math.ceil(Number(item.question.expected_minutes)),0);
  assert.equal(queue.length,2);
  assert.ok(minutes<=60);
});
