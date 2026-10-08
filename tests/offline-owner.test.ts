import test from "node:test";
import assert from "node:assert/strict";
import { canReplayPending } from "../src/lib/study/offline-owner-policy.ts";

const userA="550e8400-e29b-41d4-a716-446655440000";
const userB="550e8400-e29b-41d4-a716-446655440001";
test("offline attempts and sessions can only replay to their originating identity",()=>{
  assert.equal(canReplayPending(userA,userA),true);
  assert.equal(canReplayPending(userA,userB),false);
  assert.equal(canReplayPending(undefined,userA),false);
  assert.equal(canReplayPending(userA,null),false);
});
