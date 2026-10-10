import test from "node:test";
import assert from "node:assert/strict";
import {OFFLINE_QUEUE_KEYS,type OfflineQueueRaw} from "../src/lib/study/offline-recovery.ts";
import {recoveryInventory,rehearsePriorState} from "../src/lib/study/prior-state-rehearsal.ts";

const records=(ids:string[]):OfflineQueueRaw=>({
  [OFFLINE_QUEUE_KEYS[0]]:JSON.stringify(ids.map(ownerId=>({ownerId}))),
  [OFFLINE_QUEUE_KEYS[1]]:"[]",
  [OFFLINE_QUEUE_KEYS[2]]:"[]",
});
test("baseline is an inventory and never becomes a restore/purge/release authorization",()=>{
  const baseline=recoveryInventory(records(["owner-a"]),"owner-a","owner-a","semester-1");
  assert.equal(baseline.owned,1);
  const comparison=rehearsePriorState(baseline,baseline);
  assert.equal(comparison.decision,"UNCHANGED");
  assert.equal(comparison.canRestore,false);
  assert.equal(comparison.canPurge,false);
  assert.equal(comparison.canRelease,false);
});
test("owner switch and legacy/foreign queues block manual recovery rehearsal",()=>{
  const first=recoveryInventory(records(["owner-a"]),"owner-a","owner-a","s1");
  assert.equal(rehearsePriorState(first,recoveryInventory(records(["owner-a"]),"owner-a","owner-b","s1")).decision,"BLOCKED");
  assert.equal(rehearsePriorState(first,recoveryInventory(records(["owner-a","owner-b"]),"owner-a","owner-a","s1")).decision,"BLOCKED");
  assert.equal(rehearsePriorState(null,first).decision,"BLOCKED");
});
test("semester rollover does not silently assign old queues to the next semester",()=>{
  const first=recoveryInventory(records(["owner-a"]),"owner-a","owner-a","s1");
  const next=recoveryInventory(records(["owner-a"]),"owner-a","owner-a","s2");
  const result=rehearsePriorState(first,next);
  assert.equal(result.decision,"BLOCKED");assert.match(result.reasons[0],/semester changed/i);
});
test("queued data disappearance and concurrent new data require independent reconciliation",()=>{
  const first=recoveryInventory(records(["owner-a","owner-a"]),"owner-a","owner-a","s1");
  const less=rehearsePriorState(first,recoveryInventory(records(["owner-a"]),"owner-a","owner-a","s1"));
  assert.equal(less.decision,"REVIEW_REQUIRED");
  assert.match(less.reasons.join(" "),/server acknowledgment/);
  const more=rehearsePriorState(first,recoveryInventory(records(["owner-a","owner-a","owner-a"]),"owner-a","owner-a","s1"));
  assert.equal(more.decision,"REVIEW_REQUIRED");
  assert.match(more.reasons.join(" "),/Do not overwrite/);
});
test("malformed or unavailable original evidence is never interpreted as a valid recovery",()=>{
  const first=recoveryInventory(records(["owner-a"]),"owner-a","owner-a","s1");
  assert.equal(rehearsePriorState(first,recoveryInventory(null,"owner-a","owner-a","s1")).decision,"BLOCKED");
  assert.equal(rehearsePriorState(first,recoveryInventory({...records([]),[OFFLINE_QUEUE_KEYS[0]]:"bad-json"},"owner-a","owner-a","s1")).decision,"BLOCKED");
});
