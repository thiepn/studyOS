import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign,type KeyObject} from "node:crypto";
import {mkdtemp,writeFile,rm,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {auditF16SourceCustody} from "../scripts/f16-source-custody.mjs";
const head="a".repeat(40);
const now=new Date("2026-10-10T15:40:00Z");
const sha=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const roles=["source_custodian","restore_witness","cross_owner_witness","staging_reviewer","release_reviewer","postrelease_reviewer"];
async function fixture(fn:(f:any)=>Promise<void>){
  const dir=await mkdtemp(join(tmpdir(),"studyos-f16-test-"));
  const cipher=Buffer.from("synthetic encrypted archive bytes - NOT A REAL ENCRYPTION CLAIM");
  const plain=Buffer.from("disposable original stable academic test bytes");
  await writeFile(join(dir,"encrypted.bin"),cipher);
  await writeFile(join(dir,"source.bin"),plain);
  await writeFile(join(dir,"restored.bin"),plain);
  const source:any={recordedAt:"2026-10-10T15:00:00Z",sourceClass:"synthetic",
    files:[
      {kind:"encrypted_archive",path:"encrypted.bin",sha256:sha(cipher)},
      {kind:"original_snapshot",path:"source.bin",sha256:sha(plain)},
      {kind:"restored_snapshot",path:"restored.bin",sha256:sha(plain)},
    ]};
  const packet:any={version:"studyos-f16-source-v1",head,packetId:"synthetic-packet-id",
    source,ownerChecks:[{ownerPseudonym:"a-test",role:"owner",result:"allowed",evidenceSha256:sha(plain)},
      {ownerPseudonym:"b-test",role:"foreign",result:"denied",evidenceSha256:sha(cipher)}],receipts:[]};
  const roots:any[]=[],keys=new Map<string,KeyObject>();
  for(const role of roles){
    const kp=generateKeyPairSync("ed25519"),actorId="synthetic-"+role,keyId=role+"-pub";
    roots.push({role,status:"trusted",actorId,keyId,publicKeyPem:kp.publicKey.export({type:"spki",format:"pem"}).toString(),revokedKeyIds:[]});
    keys.set(role,kp.privateKey);
  }
  const resign=()=>{
    const commitment=sha(JSON.stringify({version:packet.version,head:packet.head,packetId:packet.packetId,
      source:packet.source,ownerChecks:packet.ownerChecks}));
    packet.receipts=roots.map(root=>{
      const item:any={role:root.role,actorId:root.actorId,keyId:root.keyId,head,packetId:packet.packetId,
        sourceCommitment:commitment,decision:"hold",issuedAt:"2026-10-10T15:15:00Z"};
      item.signature=sign(null,Buffer.from(JSON.stringify(item)),keys.get(root.role)!).toString("base64");
      return item;
    });
  };
  resign();
  try{await fn({packet,roots,dir,resign,plain,cipher});}
  finally{await rm(dir,{recursive:true,force:true});}
}
const inspect=(f:any)=>auditF16SourceCustody({packet:f.packet,trustRoots:f.roots,
  artifactDirectory:f.dir,expectedHead:head,now});
test("six synthetic signed roles and three actual matching files verify only byte integrity; all decisions NO_GO",()=>fixture(async f=>{
  const report=await inspect(f);
  assert.equal(report.integrity,"verified");assert.equal(report.restoreAllowed,false);
  assert.equal(report.staging,"NO_GO");assert.equal(report.release,"NO_GO");assert.equal(report.postrelease,"NO_GO");
  assert.equal(report.sourceComparison,"original_and_restore_bytes_match");
  assert.equal(report.sourceDigests?.length,3);
  assert.match(report.reasons.join(" "),/synthetic_only/);
}));
test("missing external signer authority and revoked keys both block",()=>fixture(async f=>{
  assert.equal((await inspect({...f,roots:f.roots.slice(1)})).reasons[0],"separate_authorities_missing");
  f.roots[0].revokedKeyIds.push(f.roots[0].keyId);
  assert.equal((await inspect(f)).reasons[0],"signed_source_custodian_receipt_invalid");
}));
test("replacing source metadata or cross-owner claims breaks signed commitment",()=>fixture(async f=>{
  f.packet.source.files[0].sha256="b".repeat(64);
  assert.equal((await inspect(f)).reasons[0],"signed_source_custodian_receipt_invalid");
  f.packet.source.files[0].sha256=sha(f.cipher);
  f.packet.ownerChecks[1].result="allowed";
  assert.equal((await inspect(f)).reasons[0],"signed_source_custodian_receipt_invalid");
}));
test("even resigned cross-owner 'allowed' proof never qualifies denial",()=>fixture(async f=>{
  f.packet.ownerChecks[1].result="allowed";f.resign();
  assert.equal((await inspect(f)).reasons[0],"foreign_owner_not_denied");
}));
test("on-disk source change fails SHA and differing restored bytes fail original comparison",()=>fixture(async f=>{
  await writeFile(join(f.dir,"source.bin"),"modified source");
  assert.equal((await inspect(f)).reasons[0],"original_byte_sha256_mismatch");
  await writeFile(join(f.dir,"source.bin"),f.plain);
  const newRestore=Buffer.from("different recovered bytes");
  await writeFile(join(f.dir,"restored.bin"),newRestore);
  f.packet.source.files[2].sha256=sha(newRestore);f.resign();
  assert.equal((await inspect(f)).reasons[0],"restored_bytes_do_not_match_original");
}));
test("missing original plaintext prevents a false encrypted-only restore claim",()=>fixture(async f=>{
  f.packet.source.files=f.packet.source.files.filter((x:any)=>x.kind!=="original_snapshot");
  f.resign();
  assert.equal((await inspect(f)).reasons[0],"source_contract_missing");
}));
test("path traversal and symlink escape remain denied, even if signed",()=>fixture(async f=>{
  f.packet.source.files[1].path="../somewhere";f.resign();
  assert.equal((await inspect(f)).reasons[0],"original_file_metadata_invalid");
  f.packet.source.files[1].path="link.bin";
  await symlink(join(tmpdir(),"untrusted-original.bin"),join(f.dir,"link.bin"));
  f.resign();
  assert.equal((await inspect(f)).reasons[0],"source_file_unavailable_or_unsafe");
}));
test("signed decision cannot escalate from hold to GO",()=>fixture(async f=>{
  f.packet.receipts[3].decision="go";
  assert.equal((await inspect(f)).reasons[0],"signed_staging_reviewer_receipt_invalid");
}));
test("reuse of one operator identity across roles cannot qualify",()=>fixture(async f=>{
  f.roots[1].actorId=f.roots[0].actorId;
  f.packet.receipts[1].actorId=f.roots[0].actorId;
  assert.equal((await inspect(f)).reasons[0],"signed_restore_witness_receipt_invalid");
}));
test("stale or future custody receipt fails closed",()=>fixture(async f=>{
  f.packet.receipts[0].issuedAt="2025-01-01T00:00:00Z";
  assert.equal((await inspect(f)).reasons[0],"signed_source_custodian_receipt_invalid");
}));
test("exact head always binds the source and signed decisions",()=>fixture(async f=>{
  const report=await auditF16SourceCustody({packet:f.packet,trustRoots:f.roots,
    artifactDirectory:f.dir,expectedHead:"b".repeat(40),now});
  assert.equal(report.integrity,"rejected");assert.equal(report.releaseAllowed,false);
  assert.equal(report.reasons[0],"exact_head_mismatch");
}));
