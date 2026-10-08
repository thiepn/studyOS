import test from "node:test";
import assert from "node:assert/strict";
import { DRAFT_TTL_MS,parseStudyDraft,studyQueueFingerprint,studyDraftStorageKey } from "../src/lib/study/study-draft.ts";

const session="550e8400-e29b-41d4-a716-446655440000";
const request="550e8400-e29b-41d4-a716-446655440001";
const questions=[{id:"q1",prompt:"Find x",answer_key_or_rubric:"x=2"},{id:"q2",prompt:"Prove P",answer_key_or_rubric:null}];
const fingerprint=studyQueueFingerprint("review","c",questions);
const now=Date.parse("2026-10-08T12:00:00Z");
const draft=()=>({
  version:1,fingerprint,savedAt:new Date(now).toISOString(),sessionId:session,
  sessionStartedAt:new Date(now-60000).toISOString(),questionStartedAt:new Date(now-30000).toISOString(),
  questionId:"q2",index:1,phase:"answering",requestId:request,answerSurface:"typed",
  workingText:"By induction...",responseText:"",confidence:3,independence:"hint_1",
  hint1Visible:true,hint2Visible:false,result:null,verifiedExternally:false,
  errorTypes:[],lockedDuration:0,outcomes:[{questionId:"q1",skipped:true}],
});
test("draft fingerprint isolates mode and changed rubrics",()=>{
  assert.notEqual(studyQueueFingerprint("checkpoint","c",questions),fingerprint);
  assert.notEqual(studyQueueFingerprint("review","c",[{...questions[0],answer_key_or_rubric:"new"},questions[1]]),fingerprint);
  assert.match(studyDraftStorageKey(fingerprint),/local-session-draft/);
});
test("valid draft resumes on the precise question, without regenerating request identity",()=>{
  const result=parseStudyDraft(JSON.stringify(draft()),fingerprint,["q1","q2"],now);
  assert.equal(result?.questionId,"q2");
  assert.equal(result?.requestId,request);
  assert.equal(result?.workingText,"By induction...");
  assert.equal(result?.independence,"hint_1");
});
test("restore a submit-in-progress draft in locked grading, never in answering",()=>{
  const input={...draft(),phase:"submitting",result:"partial",lockedDuration:41};
  assert.equal(parseStudyDraft(JSON.stringify(input),fingerprint,["q1","q2"],now)?.phase,"grading");
  assert.equal(parseStudyDraft(JSON.stringify({...input,phase:"answering"}),fingerprint,["q1","q2"],now),null);
});
test("rejected drafts cannot change the queue or manufacture a pre-reveal state",()=>{
  for(const patch of [
    {questionId:"q1"},{fingerprint:"other"},{confidence:8},{sessionId:"bad"},
    {outcomes:[]},{index:2},{phase:"grading",confidence:null},{independence:"solution_exposed"},
    {savedAt:new Date(now-DRAFT_TTL_MS-1).toISOString()},
  ])assert.equal(parseStudyDraft(JSON.stringify({...draft(),...patch}),fingerprint,["q1","q2"],now),null);
  assert.equal(parseStudyDraft("{invalid",fingerprint,["q1","q2"],now),null);
  assert.equal(parseStudyDraft(null,fingerprint,["q1","q2"],now),null);
});
