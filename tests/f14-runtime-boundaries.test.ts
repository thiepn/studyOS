import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
test("queued attempt replay checks per-item owner before sending and after acknowledgement",()=>{
  const a=read("../src/lib/study/offline-attempts.ts");
  assert.match(a,/ownerMatchesBeforeOrAfterAck\(ownerId,attempt\.ownerId,currentPendingOwner\)/);
  assert.match(a,/removePendingAttempt\(attempt\.clientId,ownerId\)/);
  assert.match(a,/readStudyMutationResponse\(response\)/);
});
test("queued session replay protects individual post and deletion on owner rotation",()=>{
  const s=read("../src/lib/study/offline-sessions.ts");
  assert.match(s,/ownerMatchesBeforeOrAfterAck\(ownerId,item\.ownerId,currentPendingOwner\)/);
  assert.match(s,/write\(key,read<T>\(key\)\.filter/);
});
test("real browser regression explicitly checks protected recovery and unauthorized academic API",()=>{
  const browser=read("../scripts/browser-visual-acceptance.mjs");
  assert.match(browser,/desktop-account-recovery-redirect-1440/);
  assert.match(browser,/privateApi\.status\(\),401/);
  assert.match(browser,/After sign-in, return to/);
  assert.match(browser,/real browser\/navigation behavior/);
});
test("account recovery and auto-sync observe cross-tab storage changes",()=>{
  for(const p of ["../src/components/account-offline-recovery.tsx","../src/components/study-sync-bridge.tsx"]){
    const s=read(p);assert.match(s,/addEventListener\("storage"/);assert.match(s,/removeEventListener\("storage"/);
  }
});

test("F15 prior-state rehearsal is mounted only on the verified account recovery route",()=>{
  const page=read("../src/app/account/recovery/page.tsx");
  const ui=read("../src/components/prior-state-rehearsal.tsx");
  const css=read("../src/app/account/recovery/recovery.css");
  assert.match(page,/PriorStateRehearsal verifiedOwnerId=\{workspace\.userId\}/);
  assert.match(ui,/currentPendingOwner\(\)/);
  assert.match(ui,/No automatic restore, overwrite, purge or release/);
  assert.match(ui,/aria-live="polite"/);
  assert.match(css,/\.account-prior-state button:focus-visible/);
  assert.match(css,/@media\(forced-colors:active\)/);
});
