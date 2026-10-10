import test from "node:test";
import assert from "node:assert/strict";
import {ownerMatchesBeforeOrAfterAck} from "../src/lib/study/owner-replay-guard.ts";
test("never invokes current-owner lookup for legacy or foreign records",async()=>{
  let reads=0;const get=async()=>{reads++;return "owner-a";};
  assert.equal(await ownerMatchesBeforeOrAfterAck("owner-a",undefined,get),false);
  assert.equal(await ownerMatchesBeforeOrAfterAck("owner-a","owner-b",get),false);
  assert.equal(reads,0);
});
test("owner rotations between records and acknowledgment checks fail closed",async()=>{
  let id:string|null="owner-a";
  const current=async()=>id;
  assert.equal(await ownerMatchesBeforeOrAfterAck("owner-a","owner-a",current),true);
  id="owner-b";
  assert.equal(await ownerMatchesBeforeOrAfterAck("owner-a","owner-a",current),false);
  id=null;
  assert.equal(await ownerMatchesBeforeOrAfterAck("owner-a","owner-a",current),false);
});
test("rejected identity reads and stale account matching never authorize a replay",async()=>{
  assert.equal(await ownerMatchesBeforeOrAfterAck("owner-a","owner-a",async()=>{throw Error("session unavailable")}),false);
  assert.equal(await ownerMatchesBeforeOrAfterAck("owner-a","owner-a",async()=>null),false);
});
