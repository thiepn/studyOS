/** Real Chromium screenshots against the built server, not synthetic mockups.
 * CI captures only anonymous login and auth-redirect surfaces. Any private
 * desktop/mobile dashboard acceptance still requires real consent and review. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const origin=process.env.ACCEPTANCE_BASE_URL??"http://127.0.0.1:3107";
const output=resolve(process.env.VISUAL_EVIDENCE_DIR??"evidence/f05-browser");
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const exactHead=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const expected=process.env.STUDYOS_EXPECTED_SHA;
if(expected&&exactHead!==expected)throw Error("Browser evidence checked out "+exactHead+" instead of PR exact head "+expected);
const manifest={phase:"F05",kind:"real-browser-anonymous",origin:"local-built-server",commit:exactHead,
  browser:browser.version(),files:[],limitations:["Not an authenticated academic-route screenshot","No physical-device or Google OAuth acceptance"]};
async function evidence(page,name){
  const dest=resolve(output,name+".png");
  await page.screenshot({path:dest,fullPage:true,animations:"disabled"});
  const bytes=await readFile(dest);
  manifest.files.push({name:name+".png",width:page.viewportSize()?.width??null,
    height:page.viewportSize()?.height??null,sha256:createHash("sha256").update(bytes).digest("hex")});
}
async function noOverflow(page,name){
  const dims=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
  assert.ok(dims.content<=dims.viewport+2,`${name} overflow: ${JSON.stringify(dims)}`);
}
async function ready(path){
  const target=new URL(path,origin).href;
  for(let n=0;n<35;n++){
    try{const r=await fetch(target,{redirect:"manual"});if(r.status===200||[302,303,307,308].includes(r.status))return;}
    catch{}
    await new Promise(r=>setTimeout(r,500));
  }
  throw new Error("Built server not ready for Chromium acceptance");
}
try{
  await ready("/login");
  const desktop=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const response=await desktop.goto(new URL("/login",origin).href,{waitUntil:"networkidle"});
  assert.equal(response?.status(),200);
  assert.ok(await desktop.getByRole("heading",{name:"Your study space."}).count());
  assert.ok(await desktop.getByRole("button",{name:/Continue with Google/}).count());
  await noOverflow(desktop,"desktop sign-in");
  await evidence(desktop,"desktop-login-1440");
  await desktop.keyboard.press("Tab");
  const focused=await desktop.evaluate(()=>document.activeElement?.tagName??"");
  assert.notEqual(focused,"BODY","Keyboard Tab must focus a real control");
  const denied=await desktop.goto(new URL("/login?error=oauth_callback",origin).href,{waitUntil:"networkidle"});
  assert.equal(denied?.status(),200);
  assert.ok(await desktop.getByRole("alert").count(),"Recoverable OAuth error must be announced");
  await evidence(desktop,"desktop-login-recovery-1440");
  // F14: reject unauthenticated recovery and internal API return paths using
  // real browser/navigation behavior, without creating a false signed-in user.
  await desktop.goto(new URL("/account/recovery",origin).href,{waitUntil:"networkidle"});
  assert.equal(new URL(desktop.url()).pathname,"/login","Account recovery must require an authenticated owner");
  assert.equal(new URL(desktop.url()).searchParams.get("next"),"/account/recovery");
  assert.ok(await desktop.getByText("After sign-in, return to Account recovery.",{exact:false}).count());
  await noOverflow(desktop,"desktop protected recovery redirect");
  await evidence(desktop,"desktop-account-recovery-redirect-1440");
  const privateApi=await desktop.request.get(new URL("/api/study/attempt",origin).href,{maxRedirects:0});
  assert.equal(privateApi.status(),401,"Protected academic API must return 401 JSON instead of a login redirect");
  assert.ok((privateApi.headers()["content-type"]??"").includes("application/json"),"Private API must return JSON");
  assert.equal((await privateApi.json()).ok,false);
  await desktop.goto(new URL("/login?next=%2Fapi%2Fstudy%2Fattempt",origin).href,{waitUntil:"networkidle"});
  assert.equal(await desktop.getByText(/After sign-in, return to/).count(),0,
    "API endpoints cannot be selected as post-login UI destinations");
  const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const mobile=await phone.goto(new URL("/login",origin).href,{waitUntil:"networkidle"});
  assert.equal(mobile?.status(),200);
  assert.ok(await phone.getByRole("button",{name:/Continue with Google/}).count());
  await noOverflow(phone,"mobile sign-in");
  await evidence(phone,"mobile-login-390-dpr2");
  await phone.goto(new URL("/courses",origin).href,{waitUntil:"networkidle"});
  assert.equal(new URL(phone.url()).pathname,"/login","Protected courses must redirect to sign-in");
  assert.equal(new URL(phone.url()).searchParams.get("next"),"/courses");
  await noOverflow(phone,"protected route mobile redirect");
  await evidence(phone,"mobile-protected-redirect-390-dpr2");
  // F13: actual built-server route access must still require an authenticated
  // THIEPN session. This is NOT an authenticated or cross-account screenshot.
  await phone.goto(new URL("/account/recovery",origin).href,{waitUntil:"networkidle"});
  assert.equal(new URL(phone.url()).pathname,"/login","Account recovery must not be anonymously accessible");
  assert.equal(new URL(phone.url()).searchParams.get("next"),"/account/recovery");
  assert.ok(await phone.getByText("After sign-in, return to Account recovery.",{exact:false}).count(),
    "Recovered destination should be readable without displaying account secrets");
  await noOverflow(phone,"account recovery protected redirect");
  await evidence(phone,"mobile-account-recovery-redirect-390-dpr2");
  // F15: real Chromium verifies safe return-to-work and keyboard entry.
  // No fabricated signed-in account or real physical-device evidence.
  await phone.goto(new URL("/login?next=%2Faccount%2Frecovery&error=oauth_callback",origin).href,{waitUntil:"networkidle"});
  assert.ok(await phone.getByRole("alert").count(),"Interrupted sign-in must expose an accessible recovery alert");
  assert.ok(await phone.getByText("After sign-in, return to Account recovery.",{exact:false}).count(),
    "A valid protected recovery destination must survive failed OAuth");
  await noOverflow(phone,"mobile recovery return path");
  await evidence(phone,"mobile-recovery-return-path-390-dpr2");
  manifest.limitations.push("Account recovery route checked anonymously only; no signed-in ownership evidence");
  await phone.close();await desktop.close();
  await writeFile(resolve(output,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  console.log("F05 real Chromium anonymous screenshot acceptance passed:",manifest.files.map(f=>f.name).join(", "));
}finally{await browser.close();}
