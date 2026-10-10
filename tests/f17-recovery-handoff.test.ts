import test from "node:test";
import assert from "node:assert/strict";
import {redactedRecoveryHandoff} from "../src/lib/study/recovery-handoff.ts";
import {RECOVERY_REVIEW_ITEMS} from "../src/lib/study/recovery-acceptance-guide.ts";
import {OFFLINE_QUEUE_KEYS,inspectOfflineCustody,type OfflineQueueRaw} from "../src/lib/study/offline-recovery.ts";
const raw=(ids:string[]):OfflineQueueRaw=>({
  [OFFLINE_QUEUE_KEYS[0]]:JSON.stringify(ids.map(ownerId=>({ownerId,academicAnswer:"TOP_SECRET_ANSWER"}))),
  [OFFLINE_QUEUE_KEYS[1]]:"[]",
  [OFFLINE_QUEUE_KEYS[2]]:"[]",
});
test("only matched owner metadata is user-copyable, never record contents or owner IDs",()=>{
  const c=inspectOfflineCustody(raw(["secret-owner-id","foreign-secret-id"]),"secret-owner-id","secret-owner-id");
  const text=redactedRecoveryHandoff({custody:c,activeSemesterPresent:true,
    checked:new Set(RECOVERY_REVIEW_ITEMS.map(x=>x.id))});
  assert.match(text,/1 owner-matched records remain/);
  assert.match(text,/Foreign or legacy records: present/);
  assert.match(text,/Restore \/ staging \/ release \/ postrelease: NO_GO/);
  for(const secret of ["secret-owner-id","foreign-secret-id","TOP_SECRET_ANSWER"])
    assert.equal(text.includes(secret),false);
});
test("owner mismatch does not disclose even counts",()=>{
  const c=inspectOfflineCustody(raw(["owner-a"]),"owner-a","owner-b");
  const text=redactedRecoveryHandoff({custody:c,activeSemesterPresent:false,checked:new Set()});
  assert.match(text,/counts redacted/);assert.doesNotMatch(text,/1 owner-matched/);
  assert.match(text,/Server receipt: NOT VERIFIED/);
});
test("local checkbox completion remains nonauthoritative in copied handoff",()=>{
  const c=inspectOfflineCustody(raw([]),"owner-a","owner-a");
  const text=redactedRecoveryHandoff({custody:c,activeSemesterPresent:true,
    checked:new Set(RECOVERY_REVIEW_ITEMS.map(x=>x.id))});
  assert.match(text,/Physical-device, accessibility, two-owner OAuth\/RLS and rights: OPEN/);
  assert.doesNotMatch(text,/release: GO/);
});
test("handoff clipboard is user initiated; never silently uploads owner metadata",()=>{
  const ui=requireRead("../src/components/recovery-acceptance-guide.tsx");
  assert.match(ui,/onClick=\{\(\)=>void copySafeHandoff\(\)\}/);
  assert.match(ui,/navigator\.clipboard\.writeText\(summary\)/);
  assert.doesNotMatch(ui,/fetch\(/);
});
import {readFileSync} from "node:fs";
function requireRead(path:string){return readFileSync(new URL(path,import.meta.url),"utf8");}
