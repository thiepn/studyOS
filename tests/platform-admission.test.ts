import test from "node:test";
import assert from "node:assert/strict";
import {evaluatePlatformAdmission,accountOAuthCallback} from "../src/lib/study/platform-admission.ts";

const production={
  deploymentEnv:"production",appOrigin:"https://study.example",
  publicSupabaseUrl:"https://thiepn-account.supabase.co",
  expectedSupabaseProjectRef:"thiepn-account",hasSupabasePublishableKey:true,
  hasSupabaseSecret:true,googleDriveConfigured:true,googleCalendarConfigured:true,
  buildSha:"0123456789abcdef",
};
test("complete production configuration qualifies as configured, not as a live tested user",()=>{
  const result=evaluatePlatformAdmission(production);
  assert.equal(result.coreReady,true);assert.equal(result.integrationsReady,true);assert.equal(result.releaseReady,true);
  assert.equal(result.gates.length,7);
});
test("wrong Supabase project cannot masquerade as StudyOS Account",()=>{
  const result=evaluatePlatformAdmission({...production,publicSupabaseUrl:"https://thiepn-core.supabase.co"});
  assert.equal(result.coreReady,false);assert.equal(result.releaseReady,false);
});
test("localhost, absent deployment version and missing integration credentials remain blocked",()=>{
  const result=evaluatePlatformAdmission({...production,
    appOrigin:"http://localhost:3000",buildSha:null,
    hasSupabaseSecret:false,googleDriveConfigured:false,
  });
  assert.equal(result.releaseReady,false);
  assert.ok(result.gates.some(g=>g.id==="origin"&&!g.ready));
  assert.ok(result.gates.some(g=>g.id==="build"&&!g.ready));
});
test("a local developer environment is allowed to run but cannot satisfy missing integrations",()=>{
  const result=evaluatePlatformAdmission({...production,deploymentEnv:"development",appOrigin:"http://localhost:3000",
    hasSupabaseSecret:false,googleDriveConfigured:false});
  assert.equal(result.coreReady,true);assert.equal(result.releaseReady,false);
});
test("callback URL is based on canonical origin, not arbitrary request Host",()=>{
  assert.equal(accountOAuthCallback("https://study.example","/practice?week=3"),
    "https://study.example/auth/callback?next=%2Fpractice%3Fweek%3D3");
});
