/** F17 source-backed independent evidence exchange.
 * A valid signature proves packet integrity, NEVER real device, human,
 * consent, rights, recovery or deployment approval. Read-only throughout. */
import {createHash,createPublicKey,verify} from "node:crypto";
import {readFile,realpath,stat} from "node:fs/promises";
import {relative,resolve,isAbsolute,sep} from "node:path";
import {auditF15HumanAcceptance} from "./f15-human-acceptance.mjs";
import {auditF16SourceCustody} from "./f16-source-custody.mjs";
import {auditF17SignerChronology} from "./f17-signer-chronology.mjs";

export const F17_DOMAINS=Object.freeze(["physical_android_pwa","assistive_technology","two_owner_privacy","source_rights"]);
const HOLD_ROLES=["precutover_reviewer","postrelease_reviewer"];
const HEX=/^[a-f0-9]{64}$/;
const HEAD=/^[a-f0-9]{40}$/;
const digest=value=>createHash("sha256").update(value).digest("hex");
const denied=reason=>({integrity:"rejected",releaseAllowed:false,restoreAllowed:false,staging:"NO_GO",
  release:"NO_GO",postrelease:"NO_GO",reasons:[reason],coverage:[]});
const unsigned=record=>{const copy={...record};delete copy.signature;return Buffer.from(JSON.stringify(copy));};
function signatureValid(record,root){
  if(!record||typeof record.signature!=="string"||!/^[A-Za-z0-9+/]+={0,2}$/.test(record.signature))return false;
  try{
    const key=createPublicKey(root.publicKeyPem);
    return key.asymmetricKeyType==="ed25519"&&verify(null,unsigned(record),key,Buffer.from(record.signature,"base64"));
  }catch{return false;}
}
function trusted(roots,role,actorId,keyId){
  if(!Array.isArray(roots))return null;
  const root=roots.find(r=>r?.role===role&&r?.actorId===actorId&&r?.keyId===keyId);
  return root&&root.status==="trusted"&&typeof root.publicKeyPem==="string"
    &&Array.isArray(root.revokedKeyIds)&&!root.revokedKeyIds.includes(keyId)?root:null;
}
function dateValid(date,now){
  if(typeof date!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(date))return false;
  const time=Date.parse(date);
  return Number.isFinite(time)&&time<=now.getTime()&&time>=now.getTime()-30*86400000;
}
function safe(path){
  return typeof path==="string"&&path.length>0&&path.length<=220
    &&!isAbsolute(path)&&!path.includes("\\")
    &&path.split("/").every(x=>x&&x!=="."&&x!=="..")
    &&[...path].every(c=>c.charCodeAt(0)>=32);
}
async function originalBytes(directory,path){
  if(!safe(path))throw Error("unsafe");
  const located=resolve(directory,path),rel=relative(directory,located);
  if(rel===".."||rel.startsWith(".."+sep)||isAbsolute(rel))throw Error("escape");
  const actual=await realpath(located),resolved=relative(directory,actual);
  if(resolved===".."||resolved.startsWith(".."+sep)||isAbsolute(resolved))throw Error("symlink");
  const meta=await stat(actual);
  if(!meta.isFile()||meta.size<1||meta.size>15_000_000)throw Error("invalid size");
  return readFile(actual);
}

/** Pure external packet verifier, with externally verified upstream digest
 * input. For full qualification callers MUST use auditF17ExternalExchange. */
export async function auditF17ExchangePacket({exchange,roots,ledger,ledgerRoots,
  artifactDirectory,expectedHead,expectedF15Digest,expectedF16Digest,now=new Date()}){
  if(!exchange||exchange.version!=="studyos-f17-exchange-v1"||!HEAD.test(expectedHead??"")
    ||exchange.head!==expectedHead||exchange.f15Digest!==expectedF15Digest
    ||exchange.f16Digest!==expectedF16Digest||typeof exchange.exchangeId!=="string"
    ||exchange.exchangeId.length<8||exchange.exchangeId.length>128)return denied("external_binding_invalid");
  const chronology=auditF17SignerChronology({events:ledger,roots:ledgerRoots,head:expectedHead,now});
  if(chronology.integrity!=="verified"||exchange.ledgerHash!==chronology.finalHash)
    return denied("signer_rotation_or_custody_invalid");
  if(!Array.isArray(exchange.evidence)||exchange.evidence.length!==F17_DOMAINS.length
    ||!Array.isArray(exchange.decisions)||exchange.decisions.length!==2
    ||!Array.isArray(roots)||roots.length!==F17_DOMAINS.length+2)
    return denied("independent_evidence_shape");
  const packetCommitment=digest(Buffer.from(JSON.stringify({
    version:exchange.version,head:exchange.head,exchangeId:exchange.exchangeId,
    f15Digest:exchange.f15Digest,f16Digest:exchange.f16Digest,ledgerHash:exchange.ledgerHash,
    evidence:exchange.evidence,
  })));
  const usedRoles=new Set(),usedActors=new Set((ledgerRoots??[]).map(x=>x.actorId)),usedPaths=new Set();
  const source=await realpath(artifactDirectory).catch(()=>null);
  if(!source)return denied("original_source_directory_unavailable");
  let maxObservedTime=0;
  const coverage=[];
  for(const e of exchange.evidence){
    if(!e||!F17_DOMAINS.includes(e.role)||usedRoles.has(e.role)
      ||e.head!==expectedHead||e.exchangeId!==exchange.exchangeId
      ||e.f15Digest!==expectedF15Digest||e.f16Digest!==expectedF16Digest
      ||!["synthetic","external"].includes(e.originKind)
      ||!["observed","blocked","unobserved"].includes(e.finding)
      ||!HEX.test(e.sha256??"")||!safe(e.path)||usedPaths.has(e.path)
      ||!dateValid(e.observedAt,now)||!e.actorId||usedActors.has(e.actorId))
      return denied("physical_privacy_rights_evidence_invalid");
    const root=trusted(roots,e.role,e.actorId,e.keyId);
    if(!root||!signatureValid(e,root))return denied("independent_witness_signature_invalid");
    let bytes;
    try{bytes=await originalBytes(source,e.path);}catch{return denied("original_evidence_path_unavailable");}
    if(digest(bytes)!==e.sha256)return denied("original_evidence_sha256_mismatch");
    usedRoles.add(e.role);usedActors.add(e.actorId);usedPaths.add(e.path);
    maxObservedTime=Math.max(maxObservedTime,Date.parse(e.observedAt));
    coverage.push({role:e.role,originKind:e.originKind,finding:e.finding});
  }
  if(usedRoles.size!==F17_DOMAINS.length)return denied("original_case_coverage_incomplete");
  for(const role of HOLD_ROLES){
    const d=exchange.decisions.find(item=>item?.role===role);
    if(!d||d.head!==expectedHead||d.exchangeId!==exchange.exchangeId
      ||d.packetCommitment!==packetCommitment||d.decision!=="hold"
      ||!dateValid(d.recordedAt,now)||Date.parse(d.recordedAt)<maxObservedTime
      ||!d.actorId||usedActors.has(d.actorId))return denied("separate_hold_review_missing");
    const root=trusted(roots,role,d.actorId,d.keyId);
    if(!root||!signatureValid(d,root))return denied("separate_hold_signature_invalid");
    usedActors.add(d.actorId);
  }
  const fullyObserved=coverage.every(x=>x.originKind==="external"&&x.finding==="observed");
  return {integrity:"verified",releaseAllowed:false,restoreAllowed:false,
    staging:"NO_GO",release:"NO_GO",postrelease:"NO_GO",
    packetCommitment,coverage,
    reasons:[fullyObserved?"external_labels_integrity_only":"synthetic_or_unobserved_original_evidence",
      "real_physical_human_origin_not_cryptographically_proven",
      "independent_owner_release_approval_open",
      "original_restore_execution_and_two_owner_rls_still_open"]};
}

/** Always re-verifies F13→F14→F15 plus original F16 source bytes first. */
export async function auditF17ExternalExchange({f15,f16,exchange,roots,ledger,ledgerRoots,
  artifactDirectory,expectedHead,now=new Date()}){
  const upstream15=await auditF15HumanAcceptance({...f15,artifactDirectory,expectedHead,now});
  if(upstream15.integrity!=="verified")return denied("f15_"+upstream15.reasons[0]);
  const upstream16=await auditF16SourceCustody({...f16,artifactDirectory,expectedHead,now});
  if(upstream16.integrity!=="verified")return denied("f16_"+upstream16.reasons[0]);
  return auditF17ExchangePacket({exchange,roots,ledger,ledgerRoots,artifactDirectory,expectedHead,
    expectedF15Digest:digest(Buffer.from(JSON.stringify(f15.originals))),
    expectedF16Digest:digest(Buffer.from(JSON.stringify(f16.packet))),now});
}
