import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {F15_DOMAINS,auditF15HumanAcceptance} from "../scripts/f15-human-acceptance.mjs";
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
test("original evidence contract requires distinct physical/accessibility, source rights, and two-owner privacy domains",()=>{
  assert.deepEqual(F15_DOMAINS,["device_accessibility","source_rights","privacy_two_owner"]);
  const s=read("../scripts/f15-human-acceptance.mjs");
  for(const condition of ["signed(a,root)","occupied.add(a.actorId)","source_bytes_unavailable",
    "original_source_hash_mismatch","independent_release_custody_missing","role of [\"prerelease\",\"postrelease\"]"]){
    assert.ok(s.includes(condition),condition);
  }
});
test("human review rejects missing original F14 witness chain before considering fabricated attestation claims",async()=>{
  const outcome=await auditF15HumanAcceptance({f14:{packet:{version:"bad"},review:{},custody:{}},
    originals:{version:"studyos-f15-v1"},roots:{},artifactDirectory:"/tmp/nonexistent",expectedHead:"a".repeat(40)});
  assert.equal(outcome.integrity,"rejected");
  assert.equal(outcome.releaseAllowed,false);
  assert.equal(outcome.preRelease,"NO_GO");
  assert.equal(outcome.postRelease,"NO_GO");
  assert.equal(outcome.canRestore,false);
  assert.equal(outcome.canPurge,false);
});
test("no runtime accepts a self-described approval or performs writes/restores",()=>{
  const src=read("../scripts/f15-human-acceptance.mjs");
  assert.match(src,/\["hold","request_review"\]/);
  assert.doesNotMatch(src,/\.writeFile\(/);
  assert.doesNotMatch(src,/\.unlink\(/);
  assert.doesNotMatch(src,/\.from\("study_/);
});
