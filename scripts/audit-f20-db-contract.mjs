#!/usr/bin/env node
/** Static repository contract audit only. It performs NO database connection,
 * mutation, migration or authenticated privacy testing. Real two-user tests
 * remain an independent release blocker. */
import {readFileSync,existsSync} from "node:fs";
const checks=[
  ["initial semester owner and non-anonymous RPC",
   "supabase/migrations/20261007123500_studyos_p29_generic_first_semester.sql",
   [/create or replace function public\.study_create_initial_semester\(/i,/auth\.uid\(\)/i,/is_anonymous/i,/user_id\s*=\s*v_user/i,/revoke all on function public\.study_create_initial_semester/i,/grant execute on function public\.study_create_initial_semester\([^;]+\) to authenticated/is]],
  ["dynamic owner-only readiness snapshot",
   "supabase/migrations/20261007125500_studyos_p29_dynamic_readiness_snapshot.sql",
   [/security invoker/i,/auth\.uid\(\)/i,/is_anonymous/i,/where user_id=v_user and active/i,/r\.user_id=v_user/i,/q\.user_id=v_user/i,/grant execute on function public\.study_readiness_snapshot\(\) to authenticated/i]],
  ["calendar credential RLS denies anonymous and authenticated clients",
   "supabase/migrations/20261005142947_studyos_p11_calendar_autopilot_foundation.sql",
   [/alter table public\.study_calendar_credentials enable row level security/i,/study_calendar_credentials_deny_clients/i,/using \(false\)/i,/revoke all on public\.study_calendar_connections,public\.study_calendar_credentials[^;]+ from anon/is,/revoke all on public\.study_calendar_credentials from authenticated/i]],
  ["historical priors scoped and current-semester governed",
   "supabase/migrations/20261006215632_studyos_p27_prior_write_and_roster_certification_guards.sql",
   [/new\.user_id:=v_user/i,/where id=new\.course_id and c\.user_id=v_user|where c\.id=new\.course_id and c\.user_id=v_user/i,/archived historical priors are read only/i,/study_courses_invalidate_bootstrap_on_roster_change/i]],
];
let failed=0;
for(const [title,path,patterns] of checks){
  if(!existsSync(path)){console.error("FAIL "+title+": missing "+path);failed++;continue;}
  const source=readFileSync(path,"utf8");
  const missing=patterns.filter(re=>!re.test(source));
  if(missing.length){console.error("FAIL "+title+": "+missing.length+" required contract markers absent");failed++;}
  else console.log("PASS "+title);
}
if(failed){console.error("F20 static contracts failed: "+failed);process.exitCode=1;}
else console.log("F20 static contracts PASS. Live RLS, OAuth, SQL functions, migrations and owner isolation NOT tested.");
