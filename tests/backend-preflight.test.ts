import test from "node:test";
import assert from "node:assert/strict";
import {evaluateStudyBackendReadiness,inspectStudyBackendReadiness} from "../src/lib/study/backend-preflight.ts";

test("new authenticated user has a healthy read-only backend without fake semester records",()=>{
  const result=evaluateStudyBackendReadiness({workspace_initialized:false,course_count:0});
  assert.equal(result.healthy,true);
  assert.equal(result.semesterInitialized,false);
  assert.equal(result.courseCount,0);
});
test("an initialized semester is reported from actual RPC fields",()=>{
  const result=evaluateStudyBackendReadiness({workspace_initialized:true,course_count:4});
  assert.equal(result.healthy,true);
  assert.equal(result.semesterInitialized,true);
  assert.equal(result.courseCount,4);
});
test("missing RPC, invalid results and transport failures never certify database readiness",async()=>{
  assert.equal(evaluateStudyBackendReadiness(null,"PGRST202").healthy,false);
  assert.equal(evaluateStudyBackendReadiness({workspace_initialized:"yes",course_count:4}).healthy,false);
  assert.equal(evaluateStudyBackendReadiness({workspace_initialized:false,course_count:-1}).healthy,false);
  assert.equal((await inspectStudyBackendReadiness({rpc:async()=>{throw Error("failed")}})).healthy,false);
});
test("read-only preflight invokes exactly one readiness RPC and no mutating endpoint",async()=>{
  const called:string[]=[];
  const r=await inspectStudyBackendReadiness({rpc:async name=>{
    called.push(name);
    return {data:{workspace_initialized:false,course_count:0},error:null};
  }});
  assert.equal(r.healthy,true);
  assert.deepEqual(called,["study_readiness_snapshot"]);
});
