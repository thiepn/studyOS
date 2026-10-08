import test from "node:test";
import assert from "node:assert/strict";
import {isApiRoute,isPublicHealthRoute} from "../src/lib/study/api-boundary.ts";
import {readStudyMutationResponse,StudySyncError} from "../src/lib/study/sync-response.ts";

test("private API is unauthorized JSON rather than a login page",()=>{
  assert.equal(isApiRoute("/api/study/attempt"),true);
  assert.equal(isApiRoute("/api/study/session/start"),true);
  assert.equal(isApiRoute("/practice"),false);
  assert.equal(isPublicHealthRoute("/api/health"),true);
  assert.equal(isPublicHealthRoute("/api/study/attempt"),false);
});
test("a genuine study JSON acknowledgment confirms a write",async()=>{
  const value=await readStudyMutationResponse(Response.json({ok:true,data:{id:"attempt"}}));
  assert.deepEqual(value,{ok:true,data:{id:"attempt"}});
});
test("HTTP 200 HTML or JSON missing ok:true MUST NOT destroy an offline attempt",async()=>{
  const html=new Response("<html>Login</html>",{headers:{"content-type":"text/html"}});
  await assert.rejects(()=>readStudyMutationResponse(html),(e:unknown)=>e instanceof StudySyncError && !e.permanent);
  await assert.rejects(()=>readStudyMutationResponse(Response.json({error:"unknown"})),StudySyncError);
});
test("authentication failures remain permanent until signed in again",async()=>{
  await assert.rejects(()=>readStudyMutationResponse(Response.json({ok:false},{status:401})),
    (e:unknown)=>e instanceof StudySyncError && e.permanent && e.authRequired);
  await assert.rejects(()=>readStudyMutationResponse(Response.json({ok:false},{status:403})),
    (e:unknown)=>e instanceof StudySyncError && e.permanent && e.authRequired);
});
test("rate-limit and server errors are transient, malformed input is permanent",async()=>{
  for(const status of [429,500,503])await assert.rejects(
    ()=>readStudyMutationResponse(Response.json({ok:false},{status})),
    (e:unknown)=>e instanceof StudySyncError && !e.permanent);
  await assert.rejects(()=>readStudyMutationResponse(Response.json({ok:false,error:"Invalid UUID"},{status:400})),
    (e:unknown)=>e instanceof StudySyncError && e.permanent);
});
