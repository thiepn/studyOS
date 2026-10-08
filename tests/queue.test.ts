import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewQueue, queueMinutes, scopeDueSkills, weakestRequiredDimension } from "../src/lib/study/queue.ts";
import type { DueSkill, StudyQuestion } from "../src/lib/study/types.ts";

const due = (overrides: Partial<DueSkill> = {}): DueSkill => ({
  user_id:"u",skill_id:"s1",course_id:"c",semester_id:"sem",skill_title:"Skill",skill_kind:"problem_solving",
  exam_importance:3,prerequisite_importance:3,required_dimensions:["recognition","execution"],mastery_state:"fragile",
  next_review_at:new Date(0).toISOString(),due_reason:"maintenance",lapse_count:0,consecutive_failures:0,relearning_until:null,
  evidence_floor:0.2,overdue_days:10,exam_factor:1,min_question_minutes:3,is_due:true,priority_score:5,
  recall_evidence:0.8,recognition_evidence:0.4,execution_evidence:0.2,transfer_evidence:0,exam_evidence:0,...overrides,
});
const q = (id:string, skill:string, dimension:StudyQuestion["evidence_dimension"], minutes=3): StudyQuestion => ({
  id,user_id:"u",course_id:"c",primary_skill_id:skill,question_type:"short_application",evidence_dimension:dimension,
  prompt:id,answer_key_or_rubric:"answer",hint_1:null,hint_2:null,difficulty:3,expected_minutes:minutes,source_confidence:1,origin:"generated",active:true,ingestion_run_id:null,version:1,created_at:"",updated_at:""
});

test("targets the weakest required evidence dimension",()=>assert.equal(weakestRequiredDimension(due()),"execution"));
test("selects matching question and respects fixed budget",()=>{
  const skills=[due({skill_id:"s1",priority_score:10}),due({skill_id:"s2",skill_title:"Two",priority_score:9})];
  const queue=buildReviewQueue(skills,[q("a","s1","recognition",8),q("b","s1","execution",8),q("c","s2","execution",8)],10);
  assert.equal(queue.length,1);assert.equal(queue[0].question.id,"b");
});
test("skips a question that would exceed the hard daily budget", () => {
  const queue=buildReviewQueue([due({skill_id:"s1",priority_score:9})],[q("q-long","s1","execution",45)],40);
  assert.equal(queue.length,0);assert.equal(queueMinutes(queue),0);
});
