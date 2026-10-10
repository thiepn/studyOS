import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
test("actual Chromium extends existing anonymous redirects with external URL denial",()=>{
  const source=read("../scripts/browser-visual-acceptance.mjs");
  assert.match(source,/mobile-external-return-rejected-390-dpr2/);
  assert.match(source,/External redirect cannot become an authenticated recovery destination/);
  assert.match(source,/desktop-blocked-auth-return-1440/);
  assert.match(source,/No physical-device or Google OAuth acceptance/);
});
test("F17 detached original verifier never escapes default-denied release bounds",()=>{
  const source=read("../scripts/f17-external-exchange.mjs");
  for(const item of ["auditF15HumanAcceptance","auditF16SourceCustody","auditF17SignerChronology","originalBytes","separate_hold_review_missing"]){
    assert.ok(source.includes(item),item);
  }
  assert.match(source,/restoreAllowed:false/);
  assert.match(source,/postrelease:"NO_GO"/);
  assert.doesNotMatch(source,/writeFile|\.unlink\(|\.from\("study_/);
});
