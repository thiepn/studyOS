import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign,createHash} from "node:crypto";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {auditF13Packet,F13_REQUIRED_CASES} from "../scripts/f13-witness-audit.mjs";

const head="a".repeat(40);
async function scenario(fn:(args:{packet:any;root:any;dir:string})=>Promise<void>){
  const dir=await mkdtemp(join(tmpdir(),"studyos-f13-test-"));
  const {privateKey,publicKey}=generateKeyPairSync("ed25519");
  const bytes=Buffer.from("synthetic browser page bytes");
  await writeFile(join(dir,"synthetic.png"),bytes);
  const packet:any={
    version:"studyos-f13-v1",head,originKind:"synthetic",
    operatorId:"operator-a",witnessId:"isolated-runner-b",keyId:"fixture-key",
    issuedAt:"2026-10-10T14:00:00Z",
    artifacts:[{path:"synthetic.png",sha256:createHash("sha256").update(bytes).digest("hex")}],
    cases:F13_REQUIRED_CASES.map(id=>({id,result:"passed",artifact:"synthetic.png"})),
  };
  const root={status:"trusted",keyId:packet.keyId,witnessId:packet.witnessId,publicKeyPem:publicKey.export({format:"pem",type:"spki"}).toString(),revokedKeyIds:[]};
  const signPacket=()=>{const unsigned={...packet};delete unsigned.signature;packet.signature=sign(null,Buffer.from(JSON.stringify(unsigned)),privateKey).toString("base64");};
  signPacket();
  try{await fn({packet,root,dir,resign:signPacket} as any);}
  finally{await rm(dir,{recursive:true,force:true});}
}
const audit=(packet:any,root:any,dir:string)=>auditF13Packet({packet,trustRoot:root,artifactDirectory:dir,expectedHead:head,now:new Date("2026-10-10T14:20:00Z")});
test("synthetic evidence can reconcile exact bytes but never authorize release",()=>scenario(async({packet,root,dir})=>{
  const r=await audit(packet,root,dir);
  assert.equal(r.integrity,"verified");assert.equal(r.releaseAllowed,false);
  assert.equal(r.sourceQualified,false);assert.equal(r.artifacts,1);
  assert.deepEqual(r.caseCoverage.map((x:any)=>x.id),F13_REQUIRED_CASES);
}));
test("absence of externally trusted public key fails closed",()=>scenario(async({packet,dir})=>{
  const r=await audit(packet,null,dir);
  assert.equal(r.integrity,"rejected");assert.equal(r.releaseAllowed,false);
}));
test("tampering a signed acceptance result invalidates the signature",()=>scenario(async({packet,root,dir})=>{
  packet.cases[0].result="blocked";
  assert.equal((await audit(packet,root,dir)).reasons[0],"signature_invalid");
}));
test("revoked key, replaced signer and same-operator witness are rejected",()=>scenario(async({packet,root,dir})=>{
  assert.equal((await audit(packet,{...root,revokedKeyIds:["fixture-key"]},dir)).reasons[0],"revoked_key");
  assert.equal((await audit(packet,{...root,witnessId:"new-signer"},dir)).reasons[0],"external_trust_root_required");
  packet.operatorId=packet.witnessId;
  assert.equal((await audit(packet,root,dir)).reasons[0],"witness_not_separate");
}));
test("artifact tampering or a path traversal never qualifies",()=>scenario(async({packet,root,dir})=>{
  await writeFile(join(dir,"synthetic.png"),Buffer.from("modified"));
  assert.equal((await audit(packet,root,dir)).reasons[0],"artifact_hash_mismatch");
  packet.artifacts[0].path="../other.png";
  assert.equal((await audit(packet,root,dir)).reasons[0],"signature_invalid");
}));
test("wrong exact head or old evidence cannot qualify",()=>scenario(async({packet,root,dir})=>{
  assert.equal((await auditF13Packet({packet,trustRoot:root,artifactDirectory:dir,expectedHead:"b".repeat(40)})).reasons[0],"commit_mismatch");
  const old=await auditF13Packet({packet,trustRoot:root,artifactDirectory:dir,expectedHead:head,now:new Date("2027-01-01T00:00:00Z")});
  assert.equal(old.reasons[0],"stale_or_invalid_issuance");
}));

test("a properly signed traversal, missing file or independently rotated signer still fails",()=>scenario(async({packet,root,dir,resign}:any)=>{
  packet.artifacts[0].path="../outside.png";
  packet.cases=packet.cases.map((x:any)=>({...x,artifact:"../outside.png"}));
  resign();
  assert.equal((await audit(packet,root,dir)).reasons[0],"artifact_path_or_digest_invalid");
  packet.artifacts[0].path="missing.png";
  packet.cases=packet.cases.map((x:any)=>({...x,artifact:"missing.png"}));
  resign();
  assert.equal((await audit(packet,root,dir)).reasons[0],"artifact_unavailable_or_untrusted_path");
  packet.witnessId="rotated-external-witness";
  resign();
  assert.equal((await audit(packet,root,dir)).reasons[0],"external_trust_root_required");
}));
