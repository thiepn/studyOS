/** F14 detached review. Requires externally governed, distinct signer public keys.
 * The result never grants owner release or real-world accessibility acceptance. */
import {createHash,createPublicKey,verify} from "node:crypto";
import {auditF13Packet,F13_REQUIRED_CASES} from "./f13-witness-audit.mjs";
const sha=(b)=>createHash("sha256").update(b).digest("hex");
const HEX=/^[a-f0-9]{64}$/;
const fail=(code)=>({integrity:"rejected",intake:"blocked",releaseAllowed:false,ownerDecision:"OPEN",reasons:[code],caseCoverage:[]});
const unsigned=(x,...names)=>{const a={...x};for(const n of names)delete a[n];return Buffer.from(JSON.stringify(a),"utf8");};
function verifyEd25519(input,signature,pem){
  if(typeof signature!=="string"||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(signature))return false;
  try{
    const key=createPublicKey(pem);
    return key.asymmetricKeyType==="ed25519"&&verify(null,input,key,Buffer.from(signature,"base64"));
  }catch{return false;}
}
const validTime=(value,now)=>{
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))return null;
  const time=Date.parse(value);
  return Number.isFinite(time)&&time<=now.getTime()&&time>=now.getTime()-30*86400000?time:null;
};
function validRoleRoot(root,role,id,keyId){
  return Boolean(root&&root.status==="trusted"&&root.role===role&&root.actorId===id
    &&root.keyId===keyId&&typeof root.publicKeyPem==="string"&&root.publicKeyPem.length>0
    &&!(root.revokedKeyIds??[]).includes(keyId));
}
export async function auditF14Review({packet,witnessTrustRoot,review,reviewerTrustRoot,custody,custodianTrustRoot,artifactDirectory,expectedHead,now=new Date()}){
  const witness=await auditF13Packet({packet,trustRoot:witnessTrustRoot,artifactDirectory,expectedHead,now});
  if(witness.integrity!=="verified")return fail("witness_"+witness.reasons[0]);
  if(!review||review.version!=="studyos-f14-review-v1"||review.head!==expectedHead
    ||review.packetSha256!==witness.packetSha256)return fail("review_witness_binding");
  if(!custody||custody.version!=="studyos-f14-custody-v1"||custody.head!==expectedHead
    ||custody.packetSha256!==witness.packetSha256||!Array.isArray(custody.events)
    ||custody.events.length<2||custody.events.length>64)return fail("custody_binding");
  if(!["hold","refer_to_owner"].includes(review.decision)||!Array.isArray(review.cases)
    ||review.cases.length>F13_REQUIRED_CASES.length)return fail("review_shape");
  const actors=[packet.operatorId,packet.witnessId,review.reviewerId,custody.custodianId];
  if(actors.some(x=>typeof x!=="string"||x.length<3)||new Set(actors).size!==actors.length)
    return fail("roles_not_segregated");
  if(!validRoleRoot(reviewerTrustRoot,"reviewer",review.reviewerId,review.reviewKeyId)
    ||!validRoleRoot(custodianTrustRoot,"custodian",custody.custodianId,custody.custodianKeyId))
    return fail("independent_review_roots_required");
  const reviewTime=validTime(review.reviewedAt,now);
  if(reviewTime===null||reviewTime<Date.parse(packet.issuedAt))return fail("review_chronology");
  if(!verifyEd25519(unsigned(review,"signature"),review.signature,reviewerTrustRoot.publicKeyPem))
    return fail("review_signature_invalid");
  let lastHash="0".repeat(64),lastTime=0;
  const states=new Map();
  for(let i=0;i<custody.events.length;i++){
    const event=custody.events[i];
    if(!event||event.sequence!==i+1||event.previousHash!==lastHash||!["activate","revoke"].includes(event.action)
      ||!["witness","reviewer"].includes(event.role)||typeof event.keyId!=="string"
      ||event.keyId.length<1||event.custodianId!==custody.custodianId)return fail("custody_chain_shape");
    const timestamp=validTime(event.occurredAt,now);
    if(timestamp===null||timestamp<lastTime||timestamp>reviewTime)return fail("custody_nonmonotonic");
    const signed=unsigned(event,"signature","sha256");
    if(!HEX.test(event.sha256??"")||sha(signed)!==event.sha256
      ||!verifyEd25519(signed,event.signature,custodianTrustRoot.publicKeyPem))return fail("custody_signature_or_hash_invalid");
    const id=event.role+":"+event.keyId,state=states.get(id)??"unknown";
    if(event.action==="activate"&&state!=="unknown")return fail("custody_reactivation_forbidden");
    if(event.action==="revoke"&&state!=="active")return fail("custody_revocation_without_activation");
    states.set(id,event.action==="activate"?"active":"revoked");
    lastHash=event.sha256;lastTime=timestamp;
  }
  if(custody.finalHash!==lastHash||states.get("witness:"+packet.keyId)!=="active"
    ||states.get("reviewer:"+review.reviewKeyId)!=="active")return fail("active_signer_chain_incomplete");
  const byId=new Map();
  for(const item of review.cases){
    if(!item||!F13_REQUIRED_CASES.includes(item.id)||byId.has(item.id)
      ||!["observed","blocked","unobserved"].includes(item.result)
      ||!HEX.test(item.artifactSha256??""))return fail("review_case_invalid");
    // A witness may only refer to its actual source-file hash.
    if(!(packet.artifacts??[]).some(a=>a.sha256===item.artifactSha256)
      ||!(packet.cases??[]).some(c=>c.id===item.id&&c.result==="passed"
        &&packet.artifacts.some(a=>a.path===c.artifact&&a.sha256===item.artifactSha256)))
      return fail("review_case_source_mismatch");
    byId.set(item.id,item.result);
  }
  const coverage=F13_REQUIRED_CASES.map(id=>({id,result:byId.get(id)??"unobserved"}));
  const complete=coverage.every(x=>x.result==="observed");
  // An externally *labeled* packet, signed reviewer and valid custody establish
  // inspectable provenance only. Human source rights and device reality remain OPEN.
  return {integrity:"verified",intake:complete&&witness.sourceQualified?"ready_for_owner_review":"incomplete",
    releaseAllowed:false,ownerDecision:"OPEN",
    reasons:[
      witness.sourceQualified?"external_source_label_unproven":"synthetic_only",
      complete?"signed_review_coverage_present":"review_cases_open",
      "real_device_accessibility_unverified","cross_account_oauth_unverified","independent_owner_release_open",
    ],
    caseCoverage:coverage,packetSha256:witness.packetSha256,reviewSha256:sha(Buffer.from(JSON.stringify(review)))};
}
