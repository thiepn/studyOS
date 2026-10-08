import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const base=new URL("../supabase/migrations/",import.meta.url);
const read=(filename:string)=>readFileSync(new URL(filename,base),"utf8");
test("P29 initial-semester RPC is invoker-only, owner-scoped and not anonymous",()=>{
  const sql=read("20261007123500_studyos_p29_generic_first_semester.sql");
  assert.match(sql,/function public\.study_create_initial_semester\(/i);
  assert.match(sql,/v_user uuid := \(select auth\.uid\(\)\)/);
  assert.match(sql,/user_id=v_user/);
  assert.match(sql,/revoke all on function public\.study_create_initial_semester\([^;]+from public,anon/i);
  assert.match(sql,/grant execute on function public\.study_create_initial_semester\([^;]+to authenticated/i);
  assert.doesNotMatch(sql,/security definer/i);
  assert.doesNotMatch(sql,/insert into public\.study_courses/i);
});
test("readiness migration never imposes hardcoded semester key or six-course inventory",()=>{
  const sql=read("20261007125500_studyos_p29_dynamic_readiness_snapshot.sql");
  assert.match(sql,/where user_id=v_user and active/i);
  assert.doesNotMatch(sql,/stable_key\s*=\s*'ws26_27'/i);
  assert.doesNotMatch(sql,/v_course_count\s*=\s*6/i);
  assert.match(sql,/v_course_count>0/);
  assert.match(sql,/revoke all on function public\.study_readiness_snapshot\(\) from public,anon/i);
});
