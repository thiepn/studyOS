import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {RECOVERY_REVIEW_ITEMS,reviewReadiness,type RecoveryReviewItemId} from "../src/lib/study/recovery-acceptance-guide.ts";
const read=(file:string)=>readFileSync(new URL(file,import.meta.url),"utf8");
test("all local recovery review inputs are informational and cannot authorize restore/deploy",()=>{
  const none=reviewReadiness(new Set<RecoveryReviewItemId>());
  const complete=reviewReadiness(new Set(RECOVERY_REVIEW_ITEMS.map(x=>x.id)));
  assert.equal(none.status,"REVIEW_PENDING");assert.equal(none.remaining.length,4);
  assert.equal(complete.status,"AWAITING_INDEPENDENT_VERIFICATION");
  assert.equal(complete.remaining.length,0);
  for(const outcome of [none,complete]){assert.equal(outcome.canRestore,false);assert.equal(outcome.canDeploy,false);}
});
test("accessible source-recovery guide retains local-only user confirmation boundaries",()=>{
  const page=read("../src/app/account/recovery/page.tsx");
  const widget=read("../src/components/recovery-acceptance-guide.tsx");
  const style=read("../src/app/account/recovery/recovery.css");
  assert.match(page,/RecoveryAcceptanceGuide/);
  assert.match(widget,/<fieldset>/);assert.match(widget,/<legend>/);
  assert.match(widget,/aria-live="polite"/);
  assert.match(widget,/No data leaves this page/);
  assert.match(widget,/Restore: NO_GO/);
  assert.match(style,/@media\(forced-colors:active\)/);
  assert.match(style,/@media\(max-width:620px\)/);
});

test("F16 exact-browser regression explicitly rejects authentication endpoint as return destination",()=>{
  const browser=read("../scripts/browser-visual-acceptance.mjs");
  assert.match(browser,/desktop-blocked-auth-return-1440/);
  assert.ok(browser.includes("/login?next=%2Fauth%2Fsignout"));
  assert.match(browser,/desktop disallowed recovery destination/);
});
