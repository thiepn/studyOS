import test from "node:test";
import assert from "node:assert/strict";
import {OFFLINE_QUEUE_KEYS,inspectOfflineCustody,offlineCustodyExplanation,type OfflineQueueRaw} from "../src/lib/study/offline-recovery.ts";
const owner="owner-one",other="owner-two";
const raw=(attempts:unknown[]=[],starts:unknown[]=[],finishes:unknown[]=[]):OfflineQueueRaw=>({
  [OFFLINE_QUEUE_KEYS[0]]:JSON.stringify(attempts),
  [OFFLINE_QUEUE_KEYS[1]]:JSON.stringify(starts),
  [OFFLINE_QUEUE_KEYS[2]]:JSON.stringify(finishes),
});
test("only current verified THIEPN owner can inspect retriable queue custody",()=>{
  for(const claimant of [null,"",other]){
    const result=inspectOfflineCustody(raw([{ownerId:owner}]),owner,claimant);
    assert.equal(result.status,"owner_mismatch");assert.equal(result.canRetry,false);assert.equal(result.total,0);
  }
  assert.equal(inspectOfflineCustody(null,owner,owner).status,"storage_unavailable");
});
test("foreign and legacy records never become retriable under another account",()=>{
  const result=inspectOfflineCustody(raw([{ownerId:owner},{ownerId:other},{queuedAt:"legacy"}],[{ownerId:other}],[{ownerId:owner}]),owner,owner);
  assert.deepEqual([result.owned,result.otherOwner,result.unowned,result.total],[2,2,1,5]);
  assert.equal(result.status,"legacy_unowned");assert.equal(result.canRetry,false);
  assert.match(offlineCustodyExplanation(result),/cannot be assigned to another account/);
});
test("malformed or oversized storage is denied without displaying payloads",()=>{
  for(const bad of ["{broken","{}",JSON.stringify(["rawstring"]),JSON.stringify(Array.from({length:10001},()=>({ownerId:owner}))) ]){
    const values=raw();values[OFFLINE_QUEUE_KEYS[0]]=bad;
    const result=inspectOfflineCustody(values,owner,owner);
    assert.equal(result.status,"malformed");assert.equal(result.canRetry,false);
  }
});
test("only owner-tagged records may be retried; empty queues never certify remote receipt",()=>{
  const entries=inspectOfflineCustody(raw([{ownerId:owner},{ownerId:other}],[],[{ownerId:owner}]),owner,owner);
  assert.equal(entries.canRetry,true);assert.equal(entries.owned,2);assert.equal(entries.otherOwner,1);
  const empty=inspectOfflineCustody(raw(),owner,owner);
  assert.equal(empty.canRetry,false);
  assert.match(offlineCustodyExplanation(empty),/does not independently prove server receipt/);
});
