import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign,type KeyObject} from "node:crypto";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {auditF17ExchangePacket,auditF17ExternalExchange,F17_DOMAINS} from "../scripts/f17-external-exchange.mjs";
const HEAD="a".repeat(40),now=new Date("2026-10-10T17:30:00Z"),f15Digest="b".repeat(64),f16Digest="c".repeat(64);
const sha=(data:Buffer|string)=>createHash("sha256").update(data).digest("hex");
const ids=[...F17_DOMAINS,"precutover_reviewer","postrelease_reviewer"];
async function fixture(callback:(f:any)=>Promise<void>){
  const dir=await mkdtemp(join(tmpdir(),"f17-disposable-"));
  const pub:any[]=[],priv=new Map<string,KeyObject>();
  const maker=(role:string,actorId:string,keyId:string)=>{
    const pair=generateKeyPairSync("ed25519");
    priv.set(role,pair.privateKey);
    return {role,status:"trusted",actorId,keyId,
      publicKeyPem:pair.publicKey.export({format:"pem",type:"spki"}).toString(),revokedKeyIds:[]};
  };
  const ledgerRoots=[maker("custodian","custodian-unique","ledger-key")];
  const signature=(record:any,role:string)=>{
    const plain={...record};delete plain.signature;
    return sign(null,Buffer.from(JSON.stringify(plain)),priv.get(role)!).toString("base64");
  };
  const ledger:any[]=[];
  const root=ledgerRoots[0];
  const first:any={head:HEAD,sequence:1,previousHash:"0".repeat(64),action:"activate",
    previousKeyId:null,nextKeyId:root.keyId,custodianKeyId:root.keyId,
    custodianId:root.actorId,occurredAt:"2026-10-10T16:00:00Z"};
  first.eventHash=sha(Buffer.from(JSON.stringify(first)));
  first.signature=signature((()=>{const x={...first};delete x.eventHash;return x;})(),"custodian");
  ledger.push(first);
  const exchange:any={version:"studyos-f17-exchange-v1",head:HEAD,
    exchangeId:"synthetic-independent-exchange",f15Digest,f16Digest,ledgerHash:first.eventHash,
    evidence:[],decisions:[]};
  const roots:any[]=[];
  for(const [index,role] of F17_DOMAINS.entries()){
    const r=maker(role,"separate-reviewer-"+index,"role-key-"+index);
    roots.push(r);
    const bytes=Buffer.from("synthetic original witness "+role);
    const path=role+".bin";await writeFile(join(dir,path),bytes);
    const e:any={role,head:HEAD,exchangeId:exchange.exchangeId,
      f15Digest,f16Digest,originKind:"synthetic",finding:"observed",
      sha256:sha(bytes),path,observedAt:"2026-10-10T16:05:00Z",
      actorId:r.actorId,keyId:r.keyId};
    e.signature=signature(e,role);exchange.evidence.push(e);
  }
  const signedCommitment=()=>sha(JSON.stringify({
    version:exchange.version,head:exchange.head,exchangeId:exchange.exchangeId,
    f15Digest:exchange.f15Digest,f16Digest:exchange.f16Digest,ledgerHash:exchange.ledgerHash,
    evidence:exchange.evidence,
  }));
  for(const [index,role] of ["precutover_reviewer","postrelease_reviewer"].entries()){
    const r=maker(role,"approval-reviewer-"+index,"hold-key-"+index);roots.push(r);
    const d:any={role,head:HEAD,exchangeId:exchange.exchangeId,
      packetCommitment:signedCommitment(),decision:"hold",
      actorId:r.actorId,keyId:r.keyId,recordedAt:"2026-10-10T16:30:00Z"};
    d.signature=signature(d,role);exchange.decisions.push(d);
  }
  const args={exchange,roots,ledger,ledgerRoots,dir};
  const audit=()=>auditF17ExchangePacket({...args,artifactDirectory:dir,expectedHead:HEAD,
    expectedF15Digest:f15Digest,expectedF16Digest:f16Digest,now});
  try{await callback({...args,audit,signature,signedCommitment});}
  finally{await rm(dir,{recursive:true,force:true});}
}
test("signed original-source exchange checks four cases and two HOLD decisions without making any GO decision",()=>fixture(async x=>{
  const v=await x.audit();assert.equal(v.integrity,"verified");
  assert.equal(v.coverage.length,4);assert.equal(v.releaseAllowed,false);assert.equal(v.restoreAllowed,false);
  for(const role of ["staging","release","postrelease"]){assert.equal(v[role],"NO_GO");}
  assert.match(v.reasons.join(),/synthetic_or_unobserved/);
}));
test("separate review records must bind the full original evidence set",()=>fixture(async x=>{
  x.exchange.evidence[0].finding="blocked";
  x.exchange.evidence[0].signature=x.signature(x.exchange.evidence[0],x.exchange.evidence[0].role);
  assert.equal((await x.audit()).reasons[0],"separate_hold_review_missing");
}));
test("tampered file and a missing original file path reject instead of claiming physical evidence",()=>fixture(async x=>{
  await writeFile(join(x.dir,"physical_android_pwa.bin"),"tampered image");
  assert.equal((await x.audit()).reasons[0],"original_evidence_sha256_mismatch");
  x.exchange.evidence[0].path="../outside.bin";
  assert.equal((await x.audit()).reasons[0],"physical_privacy_rights_evidence_invalid");
}));
test("revoked independent witness and copied identity fail closed",()=>fixture(async x=>{
  x.roots[0].revokedKeyIds.push(x.roots[0].keyId);
  assert.equal((await x.audit()).reasons[0],"independent_witness_signature_invalid");
  x.roots[0].revokedKeyIds=[];
  x.exchange.evidence[1].actorId=x.exchange.evidence[0].actorId;
  assert.equal((await x.audit()).reasons[0],"physical_privacy_rights_evidence_invalid");
}));
test("cross-owner evidence cannot silently be omitted or relabeled",()=>fixture(async x=>{
  x.exchange.evidence=x.exchange.evidence.filter((e:any)=>e.role!=="two_owner_privacy");
  assert.equal((await x.audit()).reasons[0],"independent_evidence_shape");
  assert.equal((await auditF17ExchangePacket({...x,artifactDirectory:x.dir,expectedHead:HEAD,
    expectedF15Digest:f15Digest,expectedF16Digest:"f".repeat(64),now})).reasons[0],"external_binding_invalid");
}));
test("compromised or altered ledger hash invalidates entire review",()=>fixture(async x=>{
  x.exchange.ledgerHash="e".repeat(64);
  assert.equal((await x.audit()).reasons[0],"signer_rotation_or_custody_invalid");
  x.exchange.ledgerHash=x.ledger[0].eventHash;
  x.ledger[0].signature="AA==";
  assert.equal((await x.audit()).reasons[0],"signer_rotation_or_custody_invalid");
}));
test("forged GO prerelease decision is rejected regardless of signature",()=>fixture(async x=>{
  x.exchange.decisions[0].decision="go";
  x.exchange.decisions[0].signature=x.signature(x.exchange.decisions[0],"precutover_reviewer");
  assert.equal((await x.audit()).reasons[0],"separate_hold_review_missing");
}));
test("F17 top-level fails closed when original F13 through F15 inputs are missing",async()=>{
  const result=await auditF17ExternalExchange({
    f15:{f14:{packet:{version:"wrong"}},originals:{},roots:{}},
    f16:{packet:{}},exchange:{},roots:[],ledger:[],ledgerRoots:[],
    artifactDirectory:"/tmp/missing-disposable",expectedHead:HEAD,now,
  });
  assert.equal(result.integrity,"rejected");assert.match(result.reasons[0],/^f15_/);
  assert.equal(result.releaseAllowed,false);
});
