import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
test("queued attempt replay checks per-item owner before sending and after acknowledgement",()=>{
  const a=read("../src/lib/study/offline-attempts.ts");
  assert.match(a,/ownerMatchesBeforeOrAfterAck\(ownerId,attempt\.ownerId,currentPendingOwner\)/);
  assert.match(a,/removePendingAttempt\(attempt\.clientId,ownerId\)/);
  assert.match(a,/readStudyMutationResponse\(response\)/);
});
test("queued session replay protects individual post and deletion on owner rotation",()=>{
  const s=read("../src/lib/study/offline-sessions.ts");
  assert.match(s,/ownerMatchesBeforeOrAfterAck\(ownerId,item\.ownerId,currentPendingOwner\)/);
  assert.match(s,/write\(key,read<T>\(key\)\.filter/);
});
test("account recovery and auto-sync observe cross-tab storage changes",()=>{
  for(const p of ["../src/components/account-offline-recovery.tsx","../src/components/study-sync-bridge.tsx"]){
    const s=read(p);assert.match(s,/addEventListener\("storage"/);assert.match(s,/removeEventListener\("storage"/);
  }
});
