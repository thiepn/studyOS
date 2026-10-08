import test from "node:test";
import assert from "node:assert/strict";
import { chooseRepairQuestions, isIndependentRepairEvidence, validFindingSource } from "../src/lib/study/repair-policy.ts";
import { composeProblemWork, hasProblemWork } from "../src/lib/study/problem-work.ts";

test("math work stores actual reasoning and result in a single locked attempt",()=>{
  assert.equal(composeProblemWork("  f'(x)=2x  "," x=0 "), "Working / justification:\nf'(x)=2x\n\nFinal answer / claim:\nx=0");
  assert.equal(composeProblemWork(" "," 2 "),"2");
  assert.equal(composeProblemWork("proof skeleton",""),"proof skeleton");
  assert.equal(hasProblemWork(" "," "),false);
});
test("targeted repair uses exact skill and prefers high-order questions",()=>{
  const q=(id:string,skill:string,dimension:string,active=true)=>({id,primary_skill_id:skill,evidence_dimension:dimension,question_type:"problem",active,answer_key_or_rubric:"solution",expected_minutes:10});
  const picked=chooseRepairQuestions([q("a","other","exam"),q("b","target","recall"),q("c","target","transfer"),q("d","target","execution"),q("e","target","exam",false)],"target");
  assert.deepEqual(picked.map(x=>x.id),["c","d"]);
});
test("repair credit requires later correct independent skill evidence",()=>{
  const input={completed_at:"2026-10-08T14:00:00Z",result:"correct",independence:"independent",skill_id:"s"};
  assert.equal(isIndependentRepairEvidence(input,"s","2026-10-08T13:00:00Z"),true);
  for(const x of [{...input,independence:"hint_1"},{...input,result:"partial"},{...input,skill_id:"x"},{...input,completed_at:"2026-10-07T13:00:00Z"}]) assert.equal(isIndependentRepairEvidence(x,"s","2026-10-08T13:00:00Z"),false);
});
test("finding source references cannot point to another week or resource class",()=>{
  const r={id:"r",teaching_week_id:"w",resource_type:"solution"};
  assert.equal(validFindingSource(r,"r","w","solution"),true);
  assert.equal(validFindingSource(r,"r","x","solution"),false);
  assert.equal(validFindingSource(r,"r","w","exercise"),false);
  assert.equal(validFindingSource(undefined,null,"w","exercise"),true);
});
