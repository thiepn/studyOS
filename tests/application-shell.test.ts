import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getStudyRouteContext } from "../src/lib/study/route-context.ts";
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
test("route context never derives an account identity from arbitrary URLs",()=>{
  assert.deepEqual(getStudyRouteContext("/"),{current:"Today"});
  assert.deepEqual(getStudyRouteContext("/courses/abc","Differentialgleichungen"),{current:"Differentialgleichungen",parent:{label:"Courses",href:"/courses"}});
  assert.equal(getStudyRouteContext("/courses/abc").current,"Course binder");
  assert.equal(getStudyRouteContext("/diagnostics/abc").parent?.href,"/courses");
  assert.equal(getStudyRouteContext("/practice/exam/abc").parent?.href,"/practice");
  assert.equal(getStudyRouteContext("/setup/platform").current,"Platform status");
  assert.equal(getStudyRouteContext("/resources").parent?.href,"/more");
  assert.equal(getStudyRouteContext("/account").current,"Account");
  assert.equal(getStudyRouteContext("/semester/archive/abc").parent?.href,"/semesters");
  assert.equal(getStudyRouteContext("/account/unknown").current,"Account settings");
  assert.equal(getStudyRouteContext("/").parent,undefined);
});
test("page shell has a visible keyboard-first skip route to focusable main content",()=>{
  const layout=read("../src/app/layout.tsx");
  const css=read("../src/app/shell.css");
  assert.match(layout,/href="#studyos-main"/);
  assert.match(layout,/id="studyos-main"/);
  assert.match(layout,/tabIndex=\{-1\}/);
  assert.match(css,/\.studyos-skip-link:focus-visible/);
  assert.match(css,/\.studyos-content-target:focus/);
});
test("navigation exposes direct desktop and mobile destinations with account sync",()=>{
  const shell=read("../src/components/workspace-shell.tsx");
  assert.match(shell,/aria-label="Primary navigation"/);
  assert.match(shell,/aria-current=/);
  for(const href of ["/courses","/practice","/progress","/more","/assistant","/account"])assert.ok(shell.includes('"'+href+'"'),href);
  assert.match(shell,/StudySyncBridge/);
  assert.match(read("../src/components/nav.tsx"),/getStudyRouteContext/);
  const css=read("../src/app/ux-workspace.css");
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/:focus-visible/);
});
test("loading errors and not-found pages share a semantic state system",()=>{
  for(const path of ["../src/app/error.tsx","../src/app/loading.tsx","../src/app/not-found.tsx"]){
    const content=read(path);
    assert.match(content,/StudySystemState/);
    assert.match(content,/studyos-system-state/);
  }
});

test("browser artifacts use an exact checkout instead of a synthetic PR merge ref",()=>{
  const workflow=read("../.github/workflows/ci.yml");
  const browser=read("../scripts/browser-visual-acceptance.mjs");
  assert.match(workflow,/ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow,/STUDYOS_EXPECTED_SHA:/);
  assert.match(browser,/execFileSync\("git",\["rev-parse","HEAD"\]/);
  assert.match(browser,/exactHead!==expected/);
});

test("account context and semester navigation destinations do not claim URL-derived ownership",()=>{
  assert.equal(getStudyRouteContext("/account/unknown").parent?.href,"/account");
  const directory=read("../src/lib/study/more-navigation.ts");
  assert.match(directory,/href:"\/semester\/bootstrap"/);
  assert.match(directory,/href:"\/semesters"/);
  const css=read("../src/app/shell.css");
  assert.match(css,/\.academic-context-actions a:focus-visible/);
  assert.match(css,/@media\(max-width:650px\)/);
});

test("authenticated account recovery route has a discoverable active-context path and semantic navigation",()=>{
  const page=read("../src/app/account/recovery/page.tsx");
  const owner=read("../src/components/account-offline-recovery.tsx");
  const css=read("../src/app/account/recovery/recovery.css");
  assert.equal(getStudyRouteContext("/account/recovery").parent?.href,"/account");
  assert.match(read("../src/app/account/page.tsx"),/href="\/account\/recovery"/);
  assert.match(page,/supabase\.auth\.getUser\(\)/);
  assert.match(page,/workspace\.userId!==data\.user\.id/);
  assert.match(owner,/if\(await currentPendingOwner\(\)!==verifiedOwnerId\)/);
  assert.match(owner,/aria-live="polite"/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/@media\(forced-colors:active\)/);
  assert.doesNotMatch(css,/gradient\(/);
});
