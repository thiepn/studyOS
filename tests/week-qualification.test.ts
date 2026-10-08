import test from "node:test";
import assert from "node:assert/strict";
import { summarizeWeekPractice,weekPracticeNextStep,WEEK_PRACTICE_MINUTES } from "../src/lib/study/week-qualification.ts";

type Q={id:string;primary_skill_id:string;expected_minutes:number;active:boolean;answer_key_or_rubric:string|null};
const q=(id:string,skill:string,minutes:number,rubric:string|null="verified rubric",active=true):Q=>({
  id,primary_skill_id:skill,expected_minutes:minutes,answer_key_or_rubric:rubric,active,
});

test("DGL: a sheet with one long proof and short exercises only offers fitting approved questions",()=>{
  const weeks=summarizeWeekPractice([
    {skill_id:"dgl-separation",first_week_no:2},
    {skill_id:"dgl-linear",first_week_no:2},
    {skill_id:"dgl-review",first_week_no:1},
  ],[
    q("dgl-separation-1","dgl-separation",12),
    q("dgl-long-proof","dgl-separation",55),
    q("dgl-linear-1","dgl-linear",18,null),
    q("dgl-old","dgl-review",9),
  ]);
  assert.equal(WEEK_PRACTICE_MINUTES,35);
  assert.deepEqual(weeks[2],{availableQuestions:2,assessedSkills:2,withRubric:1,withoutRubric:1,excludedLongQuestions:1});
  assert.equal(weeks[1].availableQuestions,1);
  assert.equal(weekPracticeNextStep(weeks[2],2),"practice");
});
test("Stochastik: no official answer key is exposed as an externally verified question",()=>{
  const week=summarizeWeekPractice([{skill_id:"bayes",first_week_no:3}],[q("bayes-1","bayes",20,null)]);
  assert.equal(week[3].withoutRubric,1);
  assert.equal(week[3].withRubric,0);
});
test("TI: a 40-minute proof does not claim to fit a 35-minute practice set",()=>{
  const weeks=summarizeWeekPractice([{skill_id:"induction",first_week_no:4}],[q("proof","induction",40)]);
  assert.equal(weekPracticeNextStep(weeks[4],1),"prepare-questions");
  assert.equal(weeks[4].excludedLongQuestions,1);
});
test("AMP: a withdrawn programming question cannot qualify the week",()=>{
  const weeks=summarizeWeekPractice([{skill_id:"dp",first_week_no:5}],[
    q("dp-retired","dp",15,"deprecated",false),q("dp-live","dp",25,"correct invariant"),
  ]);
  assert.equal(weeks[5].availableQuestions,1);
  assert.equal(weeks[5].withRubric,1);
});
test("Unintroduced skills, absent anchors and missing question inventory never fabricate readiness",()=>{
  const weeks=summarizeWeekPractice([
    {skill_id:"unanchored",first_week_no:null},
    {skill_id:"broken",first_week_no:41},
    {skill_id:"empty",first_week_no:6},
  ],[]);
  assert.equal(weeks[6].availableQuestions,0);
  assert.equal(weeks[41],undefined);
  assert.equal(weekPracticeNextStep(weeks[6],1),"prepare-questions");
  assert.equal(weekPracticeNextStep(undefined,0),"learn-skill");
});
