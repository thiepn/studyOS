/** Read-only, detached F13 intake. Source bytes and trust roots come from outside the repository.
 * Integrity does not establish human approval, genuine two-user OAuth or physical acceptance. */
import {createHash,createPublicKey,verify as verifySignature} from "node:crypto";
import {readFile,realpath,stat} from "node:fs/promises";
import {isAbsolute,relative,resolve,sep} from "node:path";

export const F13_REQUIRED_CASES=Object.freeze([
  "account_desktop","account_mobile","active_semester",
  "course_authorization","cross_owner_denial","google_grant_separation",
  "offline_owner_recovery","keyboard_and_screen_reader",
]);
const SHA=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
const CASES=new Set(F13_REQUIRED_CASES);
const fail=(reason)=>({integrity:"rejected",releaseAllowed:false,sourceQualified:false,reasons:[reason],caseCoverage:[],artifacts:0});
function validLocalPath(value){
  return typeof value==="string"&&value.length>0&&value.length<=220&&!isAbsolute(value)
    &&!value.split(/[\\/]/).some(x=>x==="."||x===".."||!x)
    &&!/[\\\u0000-\u001f]/.test(value);
}
export async function auditF13Packet({packet,trustRoot,artifactDirectory,expectedHead,now=new Date()}){
  if(!packet||typeof packet!=="object"||Array.isArray(packet))return fail("packet_structure");
  if(packet.version!=="studyos-f13-v1"||!COMMIT.test(packet.head??"")
    ||packet.head!==expectedHead)return fail("commit_mismatch");
  if(!["synthetic","external"].includes(packet.originKind))return fail("source_class");
  if(!packet.operatorId||typeof packet.operatorId!=="string"
    ||!packet.witnessId||typeof packet.witnessId!=="string"
    ||packet.operatorId===packet.witnessId)return fail("witness_not_separate");
  if(typeof packet.issuedAt!=="string"||!Number.isFinite(Date.parse(packet.issuedAt))
    ||Math.abs(now.getTime()-Date.parse(packet.issuedAt))>30*86400000)return fail("stale_or_invalid_issuance");
  if(!trustRoot||typeof trustRoot!=="object"||trustRoot.status!=="trusted"
    ||trustRoot.keyId!==packet.keyId||trustRoot.witnessId!==packet.witnessId
    ||typeof trustRoot.publicKeyPem!=="string"||!trustRoot.publicKeyPem)return fail("external_trust_root_required");
  if(Array.isArray(trustRoot.revokedKeyIds)&&trustRoot.revokedKeyIds.includes(packet.keyId))return fail("revoked_key");
  if(typeof packet.signature!=="string"||!/^[A-Za-z0-9+/]+={0,2}$/.test(packet.signature))return fail("signature_missing");
  let key,validSignature;
  try{
    key=createPublicKey(trustRoot.publicKeyPem);
    if(key.asymmetricKeyType!=="ed25519")return fail("signature_algorithm");
    const unsigned={...packet};delete unsigned.signature;
    const bytes=Buffer.from(JSON.stringify(unsigned),"utf8");
    validSignature=verifySignature(null,bytes,key,Buffer.from(packet.signature,"base64"));
  }catch{return fail("signature_invalid");}
  if(!validSignature)return fail("signature_invalid");
  if(!Array.isArray(packet.artifacts)||packet.artifacts.length<1||packet.artifacts.length>32
    ||!Array.isArray(packet.cases)||packet.cases.length>32)return fail("evidence_shape");
  const names=new Set(),cases=new Set(),base=await realpath(artifactDirectory).catch(()=>null);
  if(!base)return fail("artifact_directory_unavailable");
  for(const item of packet.artifacts){
    if(!item||!validLocalPath(item.path)||!SHA.test(item.sha256??"")||names.has(item.path))return fail("artifact_path_or_digest_invalid");
    names.add(item.path);
    const located=resolve(base,item.path),rel=relative(base,located);
    if(rel.startsWith(".."+sep)||rel===".."||isAbsolute(rel))return fail("artifact_path_escapes_root");
    let real,meta,bytes;
    try{real=await realpath(located);meta=await stat(real);if(!meta.isFile()||meta.size>25_000_000)throw Error("unsafe file");
      const relativeReal=relative(base,real);
      if(relativeReal.startsWith(".."+sep)||relativeReal===".."||isAbsolute(relativeReal))throw Error("symlink");
      bytes=await readFile(real);
    }catch{return fail("artifact_unavailable_or_untrusted_path");}
    if(createHash("sha256").update(bytes).digest("hex")!==item.sha256)return fail("artifact_hash_mismatch");
  }
  for(const item of packet.cases){
    if(!item||!CASES.has(item.id)||cases.has(item.id)||!["passed","blocked","unobserved"].includes(item.result)
      ||typeof item.artifact!=="string"||!names.has(item.artifact))return fail("case_not_reconcilable");
    cases.add(item.id);
  }
  const complete=F13_REQUIRED_CASES.every(id=>packet.cases.some(x=>x.id===id&&x.result==="passed"));
  return {
    integrity:"verified",releaseAllowed:false,sourceQualified:packet.originKind==="external",
    sourceClass:packet.originKind,
    reasons:[
      packet.originKind==="synthetic"?"synthetic_only_not_independent_human_acceptance":"external_signature_integrity_only",
      complete?"all_declared_cases_have_artifacts":"acceptance_matrix_incomplete",
      "owner_release_approval_open","physical_device_and_real_oauth_acceptance_open",
    ],
    caseCoverage:packet.cases.map(x=>({id:x.id,result:x.result})),
    artifacts:packet.artifacts.length,
    packetSha256:createHash("sha256").update(JSON.stringify(packet)).digest("hex"),
  };
}
