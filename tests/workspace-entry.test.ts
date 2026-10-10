import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {workspaceEntryAction} from "../src/lib/study/workspace-entry.ts";
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
test("only verified account-scoped workspace data permits Continue; empty roster is not readiness",()=>{
  const base={activeSemesterName:"WS26",activeCourseCount:3,hasSemesterHistory:true,available:true};
  assert.deepEqual([workspaceEntryAction(base).status,workspaceEntryAction(base).href],["available","/"]);
  assert.equal(workspaceEntryAction({...base,activeCourseCount:0}).status,"roster_empty");
  assert.equal(workspaceEntryAction({...base,activeCourseCount:null}).status,"unverified");
  assert.equal(workspaceEntryAction({...base,available:false}).href,"/account");
  assert.equal(workspaceEntryAction({...base,activeSemesterName:null}).status,"history_only");
  assert.equal(workspaceEntryAction({...base,activeSemesterName:null,hasSemesterHistory:false}).status,"new");
});
test("account source verifies session and scopes semester+roster reads to the same owner",()=>{
  const src=read("../src/app/account/page.tsx");
  assert.match(src,/supabase\.auth\.getUser\(\)/);
  assert.match(src,/\.eq\("user_id",userId\)\.eq\("active",true\)/);
  assert.match(src,/\.eq\("user_id",userId\)\.eq\("semester_id",activeSemester\.id\)/);
  assert.match(src,/workspaceEntryAction/);
  assert.match(src,/Workspace status unavailable/);
  assert.match(src,/Study Drive and Study Calendar use separate Google grants/);
  assert.doesNotMatch(src,/getSession\(/);
});
test("recovery is user-controlled, not a claim that an interrupted action succeeded",()=>{
  const err=read("../src/app/error.tsx"),missing=read("../src/app/not-found.tsx");
  const states=read("../src/components/study-system-state.tsx");
  assert.match(err,/Do not assume the last action completed/);
  assert.match(missing,/not available to this session/);
  assert.match(states,/href="\/account"/);
  assert.match(states,/href="\/semester\/bootstrap"/);
});
