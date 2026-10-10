import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {appendOwnerPending,sameOfflineOwner} from "../src/lib/study/offline-queue-custody.ts";
const ownerA="550e8400-e29b-41d4-a716-446655440000";
const ownerB="550e8400-e29b-41d4-a716-446655440001";
const item=(ownerId:string,sessionId="shared")=>({ownerId,sessionId,queuedAt:"2026-10-10T18:00:00Z"});
test("session ID collision does not delete another signed-in owner's queued work",()=>{
  const prev=[item(ownerB)];
  const next=appendOwnerPending(JSON.stringify(prev),item(ownerA),r=>r.sessionId,20);
  assert.equal(next.length,2);
  assert.deepEqual(next[0],prev[0]);
  const repeat=appendOwnerPending(JSON.stringify(next),{...item(ownerA),queuedAt:"later"},r=>r.sessionId,20);
  assert.equal(repeat.length,2);
  assert.equal(repeat[0].ownerId,ownerB);
  assert.equal(repeat[1].queuedAt,"later");
});
test("foreign owner, legacy unowned and malformed data are never silently erased or adopted",()=>{
  const legacy={sessionId:"legacy",queuedAt:"2026-10-10T18:00:00Z"};
  const next=appendOwnerPending(JSON.stringify([legacy,item(ownerB)]),item(ownerA),r=>r.sessionId,20);
  assert.equal(next.length,3);
  assert.equal(next[0].ownerId,undefined);
  assert.equal(next[1].ownerId,ownerB);
  for(const malformed of ['{broken','{}','"string"','[null]','[42]']){
    assert.throws(()=>appendOwnerPending(malformed,item(ownerA),r=>r.sessionId,20));
  }
});
test("full queues reject new attempts without evicting any owner or retry record",()=>{
  const stored=JSON.stringify([item(ownerB,"one"),item(ownerA,"two")]);
  assert.throws(()=>appendOwnerPending(stored,item(ownerA,"third"),r=>r.sessionId,2),/full/);
  assert.equal(appendOwnerPending(stored,item(ownerA,"two"),r=>r.sessionId,2).length,2);
  assert.throws(()=>appendOwnerPending(stored,item(ownerA,"two"),r=>r.sessionId,1));
});
test("original submission owner must persist before and after online attempt/session response",()=>{
  assert.equal(sameOfflineOwner(ownerA,ownerA),true);
  for(const current of [ownerB,null,""])assert.equal(sameOfflineOwner(ownerA,current),false);
  assert.equal(sameOfflineOwner(null,ownerA),false);
});
const source=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
test("all offline writes and replay deletions are scoped to their originating owner",()=>{
  const attempts=source("../src/lib/study/offline-attempts.ts");
  const sessions=source("../src/lib/study/offline-sessions.ts");
  assert.match(attempts,/appendOwnerPending<PendingAttempt>\(/);
  assert.match(attempts,/sameOfflineOwner\(ownerId,await currentPendingOwner\(\)\)/);
  assert.match(attempts,/if \(!storageAvailable\(\)\|\|!ownerId\) return/);
  assert.match(sessions,/appendOwnerPending\(stored,pending,row=>row\.sessionId,20\)/);
  assert.match(sessions,/sameOfflineOwner\(ownerId,await currentPendingOwner\(\)\)/);
  assert.doesNotMatch(sessions,/\.slice\(-20\)/);
});
test("account switch requires a permanent authenticated user and canonical request origin",()=>{
  const route=source("../src/app/api/study/account/prepare-switch/route.ts");
  assert.match(route,/claims\.claims\.is_anonymous===true/);
  assert.match(route,/validAuthSubmission\(/);
  assert.match(route,/isQualifiedAppOrigin\(/);
});
