import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const expectedVersion=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8")).version;
const base=process.env.ACCEPTANCE_BASE_URL??"http://127.0.0.1:3107";
const expectedOrigin=new URL(base).origin;
const timeout=AbortSignal.timeout(5000);
async function request(path,opts={}){
  return fetch(new URL(path,base),{redirect:"manual",signal:AbortSignal.timeout(5000),...opts});
}
async function ready(){
  for(let attempt=0;attempt<40;attempt++){
    try{
      const result=await request("/api/health");
      if(result.status===200)return result;
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw Error("Next.js server did not become ready; inspect the CI server log.");
}
let response=await ready();
assert.equal(response.headers.get("cache-control")?.includes("no-store"),true);
const health=await response.json();
assert.equal(health.app,"studyOS");
assert.equal(health.status,"ok");
assert.equal(health.version,expectedVersion,"Health endpoint must report release package version");
assert.ok(Number.isFinite(Date.parse(health.timestamp)));
console.log("PASS: health endpoint and real release version");

for(const path of ["/courses","/setup","/practice?mode=week&week=1"]){
  response=await request(path);
  assert.ok([302,303,307,308].includes(response.status),path+" must redirect unauthenticated users");
  const location=new URL(response.headers.get("location")??"",expectedOrigin);
  assert.equal(location.pathname,"/login",path+" requires login");
  assert.equal(location.searchParams.get("next"),path,path+" preserves return destination");
  console.log("PASS: private route login guard "+path);
}
response=await request("/login");
assert.equal(response.status,200);
assert.ok((await response.text()).includes("StudyOS"));
console.log("PASS: login page publicly renders");

for(const path of ["/api/study/attempt","/api/study/session/start","/api/study/session/finish","/api/study/courses/550e8400-e29b-41d4-a716-446655440000/milestone"]){
  response=await request(path,{
    method:"POST",headers:{"content-type":"application/json"},body:"{}",
  });
  assert.equal(response.status,401,path+" must return HTTP 401, never 200 HTML or 307");
  assert.ok((response.headers.get("content-type")??"").includes("application/json"));
  assert.ok((response.headers.get("cache-control")??"").includes("no-store"));
  const payload=await response.json();
  assert.equal(payload.ok,false);
  assert.equal(payload.error,"Authentication required");
  console.log("PASS: unauthenticated API boundary "+path);
}
console.log("P37 anonymous production-server smoke passed");
