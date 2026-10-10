import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {offlineReceiptMatches,parseOfflineReceiptRequest,assertOfflineReceiptResponse} from "../src/lib/study/offline-receipt-contract.ts";
const request="550e8400-e29b-41d4-a716-446655440000";
const question="550e8400-e29b-41d4-a716-446655440001";
const course="550e8400-e29b-41d4-a716-446655440002";
const ts="2026-10-10T18:20:30.000Z";
test("read-back requires exact attempt ID, question and non-null persisted response",()=>{
 const q={kind:"attempt" as const,recordId:request,questionId:question};
 assert.equal(offlineReceiptMatches(q,{request_id:request,question_id:question,response:{attempt_id:"server-id"}}),true);
 for(const changed of [{question_id:course},{request_id:course},{response:null},{response:undefined}]){
   assert.equal(offlineReceiptMatches(q,{request_id:request,question_id:question,response:true,...changed}),false);
 }
 assert.equal(offlineReceiptMatches(q,null),false);
});
test("session start receipt checks owner-supplied fields and exact timestamp",()=>{
 const q={kind:"session_start" as const,recordId:request,startedAt:ts,sessionType:"review",courseId:course,plannedMinutes:30};
 const row={id:request,started_at:"2026-10-10T18:20:30+00:00",session_type:"review",course_id:course,planned_minutes:30};
 assert.equal(offlineReceiptMatches(q,row),true);
 for(const changed of [{id:course},{started_at:null},{started_at:"2026-10-10T18:20:29Z"},
   {course_id:question},{session_type:"coursework"},{planned_minutes:45}]){
   assert.equal(offlineReceiptMatches(q,{...row,...changed}),false);
 }
});
test("session finish receipt rejects another completion or changed note",()=>{
 const q={kind:"session_finish" as const,recordId:request,endedAt:ts,note:"actual work"};
 const row={id:request,ended_at:ts,note:"actual work"};
 assert.equal(offlineReceiptMatches(q,row),true);
 for(const changed of [{id:question},{ended_at:null},{ended_at:"2026-10-11T18:20:30.000Z"},{note:"other"}])
   assert.equal(offlineReceiptMatches(q,{...row,...changed}),false);
});
test("missing and malformed receipt requests fail closed",()=>{
 for(const bad of [null,{},[],{kind:"attempt",recordId:"bad",questionId:question},
   {kind:"attempt",recordId:request,questionId:"bad"},
   {kind:"session_start",recordId:request,startedAt:"yesterday",sessionType:"review",plannedMinutes:20},
   {kind:"session_start",recordId:request,startedAt:ts,sessionType:"unknown",plannedMinutes:20},
   {kind:"session_finish",recordId:request,endedAt:ts,note:"x".repeat(4001)}]){
   assert.equal(parseOfflineReceiptRequest(bad),null);
 }
 assert.equal(parseOfflineReceiptRequest({kind:"attempt",recordId:request,questionId:question})?.kind,"attempt");
 assert.equal(parseOfflineReceiptRequest({kind:"session_start",recordId:request,startedAt:ts,sessionType:"review",courseId:null,plannedMinutes:20})?.kind,"session_start");
 assert.equal(parseOfflineReceiptRequest({kind:"session_finish",recordId:request,endedAt:ts,note:null})?.kind,"session_finish");
});
test("HTTP success without explicit record persistence is not acknowledged",()=>{
 assert.doesNotThrow(()=>assertOfflineReceiptResponse(200,{ok:true,recorded:true}));
 for(const [status,response] of [[200,{ok:true}],[200,{ok:true,recorded:false}],[200,{ok:"true",recorded:true}],[403,{ok:true,recorded:true}],[503,null],[200,["ok"]],[200,null]] as const)
   assert.throws(()=>assertOfflineReceiptResponse(status,response),/did not confirm/);
});
const source=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
test("server receipt path requires current real user, no service role, and no data disclosure",()=>{
 const api=source("../src/app/api/study/offline-receipt/route.ts");
 assert.match(api,/supabase\.auth\.getClaims\(\)/);
 assert.match(api,/claims\?\.is_anonymous===true/);
 assert.match(api,/\.eq\("user_id",userId\)/);
 assert.match(api,/\.from\("study_attempt_requests"\)/);
 assert.match(api,/\.from\("study_sessions"\)/);
 assert.doesNotMatch(api,/createAdminClient|service_role|\.select\("\*"\)/);
 assert.match(api,/offlineReceiptMatches/);
 assert.match(api,/"cache-control":"no-store"/);
});
test("replay preflights read-back, checks original owner and removes only after verified receipt",()=>{
 const at=source("../src/lib/study/offline-attempts.ts");
 const sessions=source("../src/lib/study/offline-sessions.ts");
 for(const txt of [at,sessions]){
   assert.match(txt,/hasPersistedOfflineReceipt\(receipt\)/);
   assert.match(txt,/recordedBefore\|\|await hasPersistedOfflineReceipt\(receipt\)/);
   assert.match(txt,/ownerMatchesBeforeOrAfterAck\(/);
   assert.match(txt,/withOfflineReplayGuard\("owner-"/);
 }
 assert.match(at,/removePendingAttempt\\(attempt\\.clientId,ownerId\\)/);
 assert.match(at,/JSON\\.stringify\\(matching\\[0\\]\\)!==JSON\\.stringify\\(expected\\)/);
 assert.match(sessions,/matches\[0\]\.queuedAt!==item\.queuedAt/);
 assert.match(source("../src/lib/study/offline-replay-guard.ts"),/navigator\.locks\?\.request/);
});
test("recovery UI disclaims server receipt without actual readback",()=>{
 const r=source("../src/lib/study/offline-recovery.ts");
 assert.match(r,/authenticated database receipt/);
 const ui=source("../src/components/account-offline-recovery.tsx");
 assert.match(ui,/Check the corresponding study history/);
});
