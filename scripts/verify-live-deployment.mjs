import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

/** Read-only live qualification. No credentials, OAuth consent, account
 * mutation, course seeds or production write requests. */
const target=process.env.STUDYOS_DEPLOYMENT_URL??"";
const expectedSha=process.env.STUDYOS_EXPECTED_SHA??"";
const expectedVersion=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8")).version;
function fail(message){throw new Error(message);}
let base;
try{
  base=new URL(target);
  if(base.protocol!=="https:"||base.pathname!=="/"||base.search||base.hash||
      base.username||base.password||base.hostname==="localhost")
    fail("STUDYOS_DEPLOYMENT_URL must be a clean HTTPS origin.");
} catch {fail("Set STUDYOS_DEPLOYMENT_URL to the exact approved HTTPS deployment origin.");}
if(!/^[a-f0-9]{40}$/i.test(expectedSha))
  fail("Set STUDYOS_EXPECTED_SHA to the exact 40-character verified Git commit.");
async function check(path,options={}){
  const response=await fetch(new URL(path,base),{
    cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(10000),...options,
  });
  if([401,403].includes(response.status)&&path==="/api/health"){
    fail("Deployment is protected by Vercel or another gateway. Use an authorized test session/bypass; do not disable protections to make the check pass.");
  }
  return response;
}

const health=await check("/api/health");
assert.equal(health.status,200,"StudyOS health endpoint must return 200.");
assert.match(health.headers.get("content-type")??"",/application\/json/i);
assert.match(health.headers.get("cache-control")??"",/no-store/i);
const body=await health.json();
assert.equal(body.app,"studyOS");
assert.equal(body.status,"ok");
assert.equal(body.version,expectedVersion,"Built version must match this repository's release.");
assert.equal(body.commit,expectedSha,"Deployment must match the reviewed commit.");
console.log("PASS: exact release health/version/commit on "+base.origin);

const login=await check("/login");
assert.equal(login.status,200,"StudyOS login page must be reachable to an anonymous browser.");
assert.match(login.headers.get("content-type")??"",/text\/html/i);
assert.match(await login.text(),/StudyOS/);
console.log("PASS: StudyOS login renders");

const guard=await check("/setup/platform");
assert.ok([302,303,307,308].includes(guard.status));
const location=new URL(guard.headers.get("location")??"",base);
assert.equal(location.origin,base.origin,"Guard redirect must stay on StudyOS");
assert.equal(location.pathname,"/login");
assert.equal(location.searchParams.get("next"),"/setup/platform");
console.log("PASS: pre-semester configuration requires sign-in");

const mutation=await check("/api/study/attempt",{
  method:"POST",headers:{"content-type":"application/json"},body:"{}",
});
assert.equal(mutation.status,401,"Unauthenticated study writes must be denied.");
assert.match(mutation.headers.get("content-type")??"",/application\/json/i);
const denied=await mutation.json();
assert.equal(denied.ok,false);
console.log("PASS: unauthenticated study API denied without data mutation");

console.log("Live anonymous deployment gate PASSED. This does NOT certify authenticated OAuth, SSO, real academic content or device access.");
