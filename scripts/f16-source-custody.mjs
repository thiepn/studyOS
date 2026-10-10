/** F16 independent read-only original-byte comparison. This code NEVER
 * decrypts, restores, writes, authorizes deployment, or vouches for human source.
 * Trust roots and three originals must be delivered by independent custody. */
import {createHash,createPublicKey,verify as verifySignature,timingSafeEqual} from "node:crypto";
import {readFile,realpath,stat} from "node:fs/promises";
import {isAbsolute,relative,resolve,sep} from "node:path";

const SHA=/^[a-f0-9]{64}$/;
const HEAD=/^[a-f0-9]{40}$/;
const ROLES=["source_custodian","restore_witness","cross_owner_witness","staging_reviewer","release_reviewer","postrelease_reviewer"];
const outcome=(reason)=>({integrity:"rejected",releaseAllowed:false,restoreAllowed:false,
  staging:"NO_GO",release:"NO_GO",postrelease:"NO_GO",reasons:[reason],sourceComparison:"unverified"});
const digest=(bytes)=>createHash("sha256").update(bytes).digest("hex");
const signable=(record)=>{const copy={...record};delete copy.signature;return Buffer.from(JSON.stringify(copy),"utf8");};
function verifiedSignature(record,root){
  if(!record||typeof record.signature!=="string"||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(record.signature))return false;
  try{
    const key=createPublicKey(root.publicKeyPem);
    return key.asymmetricKeyType==="ed25519"&&verifySignature(null,signable(record),key,Buffer.from(record.signature,"base64"));
  }catch{return false;}
}
function recent(s,now){
  if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s))return false;
  const t=Date.parse(s);
  return Number.isFinite(t)&&t<=now.getTime()&&t>=now.getTime()-30*86400000;
}
function safeRelative(p){
  return typeof p==="string"&&p.length>0&&p.length<=180&&!isAbsolute(p)
    &&p.split(/[\\/]/).every(segment=>!!segment&&segment!=="."&&segment!=="..")
    &&!p.includes("\\")&&[...p].every(c=>c.charCodeAt(0)>=32);
}
async function readOriginal(base,path){
  if(!safeRelative(path))throw Error("unsafe_path");
  const location=resolve(base,path);
  const rel=relative(base,location);
  if(rel===".."||rel.startsWith(".."+sep)||isAbsolute(rel))throw Error("outside_source_root");
  const real=await realpath(location),realRel=relative(base,real);
  if(realRel===".."||realRel.startsWith(".."+sep)||isAbsolute(realRel))throw Error("symlink_escape");
  const metadata=await stat(real);
  if(!metadata.isFile()||metadata.size>10_000_000||metadata.size===0)throw Error("invalid_source_size");
  return readFile(real);
}
function checkTrust(roots,record,role){
  const root=roots?.find(r=>r?.role===role&&r?.actorId===record?.actorId);
  if(!root||root.status!=="trusted"||root.keyId!==record.keyId||!root.publicKeyPem
    ||(root.revokedKeyIds??[]).includes(record.keyId))return false;
  return verifiedSignature(record,root);
}
export async function auditF16SourceCustody({packet,trustRoots,artifactDirectory,expectedHead,now=new Date()}){
  if(!packet||packet.version!=="studyos-f16-source-v1"||!HEAD.test(packet.head??"")
    ||packet.head!==expectedHead)return outcome("exact_head_mismatch");
  if(!Array.isArray(trustRoots)||trustRoots.length!==ROLES.length
    ||!Array.isArray(packet.receipts)||packet.receipts.length!==ROLES.length)
    return outcome("separate_authorities_missing");
  if(typeof packet.packetId!=="string"||packet.packetId.length<8||packet.packetId.length>120
    ||!Array.isArray(packet.ownerChecks)||packet.ownerChecks.length!==2)
    return outcome("packet_metadata_invalid");
  // Every separately signed receipt binds the WHOLE proposed source/owner
  // manifest, not just a mutable packet identifier. Changing any source/owner
  // assertion invalidates all six originally signed decisions.
  const commitment=digest(Buffer.from(JSON.stringify({
    version:packet.version,head:packet.head,packetId:packet.packetId,
    source:packet.source,ownerChecks:packet.ownerChecks,
  })));
  const actors=new Set(),names=new Set();
  for(const role of ROLES){
    const receipt=packet.receipts.find(r=>r?.role===role);
    if(!receipt||receipt.head!==expectedHead||receipt.packetId!==packet.packetId
      ||receipt.decision!=="hold"||receipt.sourceCommitment!==commitment
      ||!recent(receipt.issuedAt,now)
      ||!receipt.actorId||actors.has(receipt.actorId)||!checkTrust(trustRoots,receipt,role))
      return outcome("signed_"+role+"_receipt_invalid");
    actors.add(receipt.actorId);
  }
  if(actors.size!==ROLES.length)return outcome("authority_reuse");
  const source=packet.source;
  if(!source||!recent(source.recordedAt,now)||!["synthetic","external"].includes(source.sourceClass)
    ||!Array.isArray(source.files)||source.files.length!==3)return outcome("source_contract_missing");
  const kinds=["encrypted_archive","original_snapshot","restored_snapshot"];
  const byKind=new Map();
  for(const item of source.files){
    if(!item||!kinds.includes(item.kind)||byKind.has(item.kind)||!SHA.test(item.sha256??"")
      ||!safeRelative(item.path)||names.has(item.path))return outcome("original_file_metadata_invalid");
    byKind.set(item.kind,item);names.add(item.path);
  }
  if(byKind.size!==kinds.length)return outcome("incomplete_original_sources");
  const base=await realpath(artifactDirectory).catch(()=>null);
  if(!base)return outcome("source_directory_missing");
  const actual=new Map();
  for(const kind of kinds){
    const item=byKind.get(kind);
    let bytes;
    try{bytes=await readOriginal(base,item.path);}catch{return outcome("source_file_unavailable_or_unsafe");}
    if(digest(bytes)!==item.sha256)return outcome("original_byte_sha256_mismatch");
    actual.set(kind,bytes);
  }
  // Byte-for-byte compare actual original snapshot and actual recovered
  // snapshot on independently provided read-only files. No restore is run.
  const original=actual.get("original_snapshot"),restored=actual.get("restored_snapshot");
  if(original.length!==restored.length||!timingSafeEqual(original,restored))
    return outcome("restored_bytes_do_not_match_original");
  if(!Array.isArray(packet.ownerChecks)||packet.ownerChecks.length!==2
    ||new Set(packet.ownerChecks.map(x=>x?.ownerPseudonym)).size!==2)
    return outcome("independent_two_owner_receipts_missing");
  for(const x of packet.ownerChecks){
    if(!x||!["allowed","denied"].includes(x.result)||!["owner","foreign"].includes(x.role)
      ||!SHA.test(x.evidenceSha256??""))return outcome("two_owner_evidence_shape");
    if(x.role==="foreign"&&x.result!=="denied")return outcome("foreign_owner_not_denied");
    if(!source.files.some(f=>f.sha256===x.evidenceSha256))return outcome("two_owner_evidence_not_bound");
  }
  if(!packet.ownerChecks.some(x=>x.role==="owner"&&x.result==="allowed")
    ||!packet.ownerChecks.some(x=>x.role==="foreign"&&x.result==="denied"))
    return outcome("two_owner_negative_test_missing");
  return {integrity:"verified",releaseAllowed:false,restoreAllowed:false,staging:"NO_GO",release:"NO_GO",
    postrelease:"NO_GO",sourceComparison:"original_and_restore_bytes_match",
    reasons:[source.sourceClass==="synthetic"?"synthetic_only":"external_label_not_independent_proof",
      "encrypted_archival_provenance_not_independently_established",
      "actual_restore_execution_not_witnessed",
      "two_account_negative_tests_not_independently_verified",
      "human_and_physical_device_approvals_open",
      "independent_staging_release_postrelease_approval_open"],
    sourceDigests:kinds.map(kind=>({kind,sha256:byKind.get(kind).sha256})),
  };
}
