import test from "node:test";
import assert from "node:assert/strict";
import {buildFirstWeekProof,proofCertifiedForAllMajors} from "../src/lib/study/first-week-proof.ts";

const majors=["dgl","stoch","ti","amp"];
const weeks=majors.map((course_id,i)=>({id:"w"+i,course_id,week_no:1}));
const sources=majors.map((course_id,i)=>({
  id:"r"+i,course_id,teaching_week_id:"w"+i,processing_status:"verified",
  active:true,resource_type:i===0?"lecture":"exercise",
}));
const links=majors.map((_,i)=>({question_id:"q"+i,resource_id:"r"+i}));
const questions=majors.map((course_id,i)=>({id:"q"+i,course_id,active:true}));
const attempts=majors.map((course_id,i)=>({id:"a"+i,course_id,question_id:"q"+i,independence:"independent"}));

test("all four university courses qualify only with sourced independent attempts",()=>{
  const rows=buildFirstWeekProof(majors,weeks,sources,links,questions,attempts);
  assert.equal(rows.length,4);
  assert.ok(rows.every(row=>row.verifiedResources===1&&row.sourceLinkedQuestions===1&&row.independentAttempts===1));
  assert.equal(proofCertifiedForAllMajors(rows,majors),true);
});
test("attempts on other questions or other courses cannot certify Week-1 work",()=>{
  const rows=buildFirstWeekProof(majors,weeks,sources,links,questions,[
    {...attempts[0],question_id:"unlinked"},
    {...attempts[1],course_id:"ti"},
    attempts[2],attempts[3],
  ]);
  assert.equal(rows[0].independentAttempts,0);
  assert.equal(rows[1].independentAttempts,0);
  assert.equal(proofCertifiedForAllMajors(rows,majors),false);
});
test("hint-assisted and retired questions cannot count as independent evidence",()=>{
  const rows=buildFirstWeekProof(majors,weeks,sources,links,
    questions.map((q,i)=>i===2?{...q,active:false}:q),
    attempts.map((a,i)=>i===1?{...a,independence:"hint_1"}:a));
  assert.equal(rows[1].independentAttempts,0);
  assert.equal(rows[2].sourceLinkedQuestions,0);
  assert.equal(proofCertifiedForAllMajors(rows,majors),false);
});
test("unverified, later-week, solution-only and mismatched sources never qualify",()=>{
  const rows=buildFirstWeekProof(majors,[...weeks,{id:"later",course_id:"dgl",week_no:2}],[
    {...sources[0],processing_status:"pending"},
    {...sources[1],resource_type:"solution"},
    {...sources[2],teaching_week_id:"later"},
    {...sources[3],course_id:"wrong-course"},
  ],links,questions,attempts);
  assert.ok(rows.every(row=>row.verifiedResources===0));
  assert.ok(rows.every(row=>row.sourceLinkedQuestions===0));
  assert.equal(proofCertifiedForAllMajors(rows,majors),false);
});
test("the system never certifies an absent roster or a missing major",()=>{
  const rows=buildFirstWeekProof(majors.slice(0,3),weeks,sources,links,questions,attempts);
  assert.equal(proofCertifiedForAllMajors(rows,majors),false);
  assert.equal(proofCertifiedForAllMajors([],[]),false);
});
test("duplicate source links and duplicate same-attempt records do not inflate qualification",()=>{
  const rows=buildFirstWeekProof(["dgl"],weeks,sources,[links[0],links[0]],questions,[attempts[0],attempts[0]]);
  assert.deepEqual(rows,[{courseId:"dgl",verifiedResources:1,sourceLinkedQuestions:1,independentAttempts:1}]);
});
