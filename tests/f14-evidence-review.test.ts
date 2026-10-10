import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign,createHash,type KeyObject} from "node:crypto";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {auditF14Review} from "../scripts/f14-evidence-review.mjs";
import {F13_REQUIRED_CASES} from "../scripts/f13-witness-audit.mjs";

const sha=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const head="a".repeat(40),now=new Date("2026-10-10T15:00:00Z");
async function fixture(callback:(ctx:any)=>Promise<void>){
  const directory=await mkdtemp(join(tmpdir(),"studyos-f14-"));
  const witnessKey=generateKeyPairSync("ed25519"),reviewKey=generateKeyPairSync("ed25519"),custodyKey=generateKeyPairSync("ed25519");
  const pem=(key:{publicKey:KeyObject})=>key.publicKey.export({format:"pem",type:"spki"}).toString();
  const signJson=(data:any,privateKey:KeyObject)=>sign(null,Buffer.from(JSON.stringify(data)),privateKey).toString("base64");
  const file=Buffer.from("Synthetic, nonuser test capture");await writeFile(join(directory,"capture.png"),file);
  const fileSha=sha(file),witnessKeyId="witness-fixture",reviewKeyId="review-fixture";
  const packet:any={version:"studyos-f13-v1",head,originKind:"synthetic",
    operatorId:"operator-fixture",witnessId:"witness-fixture-id",keyId:witnessKeyId,
    issuedAt:"2026-10-10T14:00:00Z",
    artifacts:[{path:"capture.png",sha256:fileSha}],
    cases:F13_REQUIRED_CASES.map((id:string)=>({id,result:"passed",artifact:"capture.png"})),
  };
  const witnessTrustRoot={status:"trusted",keyId:witnessKeyId,witnessId:packet.witnessId,
    publicKeyPem:pem(witnessKey),revokedKeyIds:[]};
  const resignPacket=()=>{const copy={...packet};delete copy.signature;packet.signature=signJson(copy,witnessKey.privateKey);};
  resignPacket();
  const review:any={version:"studyos-f14-review-v1",head,
    packetSha256:sha(JSON.stringify(packet)),reviewerId:"reviewer-fixture",
    reviewKeyId,reviewedAt:"2026-10-10T14:20:00Z",decision:"refer_to_owner",
    cases:F13_REQUIRED_CASES.map((id:string)=>({id,result:"observed",artifactSha256:fileSha})),
  };
  const resignReview=()=>{const x={...review};delete x.signature;review.signature=signJson(x,reviewKey.privateKey);};
  resignReview();
  const reviewerTrustRoot={status:"trusted",role:"reviewer",actorId:review.reviewerId,keyId:reviewKeyId,
    publicKeyPem:pem(reviewKey),revokedKeyIds:[]};
  const custodianTrustRoot={status:"trusted",role:"custodian",actorId:"custodian-fixture",
    keyId:"custodian-fixture-key",publicKeyPem:pem(custodyKey),revokedKeyIds:[]};
  const custody:any={version:"studyos-f14-custody-v1",head,
    packetSha256:review.packetSha256,custodianId:custodianTrustRoot.actorId,
    custodianKeyId:custodianTrustRoot.keyId,events:[],finalHash:"0".repeat(64)};
  const addEvent=(role:string,keyId:string,action:string,time:string)=>{
    const unsigned:any={sequence:custody.events.length+1,previousHash:custody.finalHash,
      action,role,keyId,custodianId:custody.custodianId,occurredAt:time};
    const digest=sha(JSON.stringify(unsigned));
    custody.events.push({...unsigned,sha256:digest,signature:signJson(unsigned,custodyKey.privateKey)});
    custody.finalHash=digest;
  };
  addEvent("witness",witnessKeyId,"activate","2026-10-10T13:40:00Z");
  addEvent("reviewer",reviewKeyId,"activate","2026-10-10T13:41:00Z");
  const ctx={packet,witnessTrustRoot,review,reviewerTrustRoot,custody,custodianTrustRoot,
    artifactDirectory:directory,expectedHead:head,now,resignReview,resignPacket,addEvent};
  try{await callback(ctx);}finally{await rm(directory,{recursive:true,force:true});}
}
const check=(a:any)=>auditF14Review(a);
test("synthetic signed witness+review+custody integrity is distinguishable from human approval",()=>fixture(async a=>{
  const result=await check(a);
  assert.equal(result.integrity,"verified");
  assert.equal(result.intake,"incomplete");
  assert.equal(result.releaseAllowed,false);
  assert.equal(result.ownerDecision,"OPEN");
  assert.ok(result.reasons.includes("synthetic_only"));
  assert.equal(result.caseCoverage.length,F13_REQUIRED_CASES.length);
}));
test("external label can prepare human review but cannot certify its own real-world provenance",()=>fixture(async a=>{
  a.packet.originKind="external";a.resignPacket();
  a.review.packetSha256=sha(JSON.stringify(a.packet));a.resignReview();
  a.custody.packetSha256=a.review.packetSha256;
  const result=await check(a);
  assert.equal(result.integrity,"verified");
  assert.equal(result.intake,"ready_for_owner_review");
  assert.equal(result.releaseAllowed,false);
  assert.ok(result.reasons.includes("external_source_label_unproven"));
}));
test("tampered independent review, wrong binding or missing trust root blocks",()=>fixture(async a=>{
  a.review.cases[0].result="blocked";
  assert.equal((await check(a)).reasons[0],"review_signature_invalid");
  a.resignReview();a.review.packetSha256="0".repeat(64);
  assert.equal((await check(a)).reasons[0],"review_witness_binding");
  a.review.packetSha256=a.custody.packetSha256;a.resignReview();
  assert.equal((await check({...a,reviewerTrustRoot:null})).reasons[0],"independent_review_roots_required");
}));
test("custodian, witness and reviewer cannot be the same actor",()=>fixture(async a=>{
  a.review.reviewerId=a.packet.operatorId;a.resignReview();
  assert.equal((await check(a)).reasons[0],"roles_not_segregated");
}));
test("revocation after activation prevents qualified review, even with valid signatures",()=>fixture(async a=>{
  a.addEvent("witness",a.packet.keyId,"revoke","2026-10-10T14:05:00Z");
  assert.equal((await check(a)).reasons[0],"active_signer_chain_incomplete");
}));
test("revoked externally governed reviewer root fails closed",()=>fixture(async a=>{
  a.reviewerTrustRoot.revokedKeyIds.push(a.review.reviewKeyId);
  assert.equal((await check(a)).reasons[0],"independent_review_roots_required");
}));
test("reordered, backdated and unsigned custody receipts are rejected",()=>fixture(async a=>{
  a.custody.events.reverse();
  assert.equal((await check(a)).reasons[0],"custody_chain_shape");
  a.custody.events.reverse();
  a.custody.events[0].sha256="0".repeat(64);
  assert.equal((await check(a)).reasons[0],"custody_signature_or_hash_invalid");
}));
test("unsupported hidden case and mismatched source artifact digest are rejected",()=>fixture(async a=>{
  a.review.cases[0].artifactSha256="a".repeat(64);a.resignReview();
  assert.equal((await check(a)).reasons[0],"review_case_source_mismatch");
  a.review.cases[0].id="unknown";a.resignReview();
  assert.equal((await check(a)).reasons[0],"review_case_invalid");
}));
test("missing scenarios and open manual findings never become owner approval",()=>fixture(async a=>{
  a.review.cases.pop();a.resignReview();
  const outcome=await check(a);
  assert.equal(outcome.integrity,"verified");assert.equal(outcome.intake,"incomplete");
  assert.equal(outcome.releaseAllowed,false);
}));
test("signatures and ledger alone cannot cross the exact head boundary",()=>fixture(async a=>{
  assert.equal((await check({...a,expectedHead:"b".repeat(40)})).reasons[0],"witness_commit_mismatch");
}));
