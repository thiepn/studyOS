/** F17 signed custody chronology: externally controlled public roots only.
 * This is an integrity verifier, not a source of trust or a release authority. */
import {createHash,createPublicKey,verify} from "node:crypto";

const HEAD=/^[a-f0-9]{40}$/;
const HEX=/^[a-f0-9]{64}$/;
const SHA=x=>createHash("sha256").update(x).digest("hex");
const denied=reason=>({integrity:"rejected",reasons:[reason],releaseAllowed:false,currentKey:null});
const encode=event=>{const value={...event};delete value.signature;delete value.eventHash;return Buffer.from(JSON.stringify(value));};
function goodSig(body,signature,pem){
  if(typeof signature!=="string"||!/^[A-Za-z0-9+/]+={0,2}$/.test(signature))return false;
  try{
    const key=createPublicKey(pem);
    return key.asymmetricKeyType==="ed25519"&&verify(null,body,key,Buffer.from(signature,"base64"));
  }catch{return false;}
}
export function auditF17SignerChronology({events,roots,head,now=new Date()}){
  if(!HEAD.test(head??"")||!Array.isArray(events)||events.length<1||events.length>64
    ||!Array.isArray(roots)||roots.length<1||roots.length>32)return denied("ledger_shape");
  const names=new Set(),actors=new Set();
  for(const root of roots){
    if(!root||root.role!=="custodian"||root.status!=="trusted"||typeof root.keyId!=="string"
      ||typeof root.actorId!=="string"||!root.actorId||!root.keyId
      ||names.has(root.keyId)||actors.has(root.actorId)
      ||typeof root.publicKeyPem!=="string"||!Array.isArray(root.revokedKeyIds))
      return denied("invalid_external_roots");
    names.add(root.keyId);actors.add(root.actorId);
  }
  let prior="0".repeat(64),priorTime=0,active=null;
  const exhausted=new Set();
  for(let i=0;i<events.length;i++){
    const e=events[i];
    if(!e||e.head!==head||e.sequence!==i+1||e.previousHash!==prior
      ||!["activate","rotate","revoke","compromise"].includes(e.action)
      ||typeof e.occurredAt!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(e.occurredAt))
      return denied("chain_order_or_shape");
    const time=Date.parse(e.occurredAt);
    if(!Number.isFinite(time)||time<priorTime||time>now.getTime()
      ||time<now.getTime()-30*86400000)return denied("chronology_invalid");
    const root=roots.find(r=>r.keyId===e.custodianKeyId&&r.actorId===e.custodianId);
    if(!root||root.revokedKeyIds.includes(root.keyId)||!HEX.test(e.eventHash??"")
      ||SHA(encode(e))!==e.eventHash
      ||!goodSig(encode(e),e.signature,root.publicKeyPem))
      return denied("custody_hash_signature_or_revocation");
    if(e.action==="activate"){
      if(active!==null||i!==0||!names.has(e.nextKeyId)||exhausted.has(e.nextKeyId))
        return denied("activation_conflict");
      active=e.nextKeyId;
    }else if(e.action==="rotate"){
      if(active===null||e.previousKeyId!==active||!names.has(e.nextKeyId)
        ||e.previousKeyId===e.nextKeyId||exhausted.has(e.nextKeyId))
        return denied("rotation_conflict");
      exhausted.add(active);active=e.nextKeyId;
    }else{
      if(active===null||e.previousKeyId!==active||e.nextKeyId!==null)
        return denied("revoke_or_compromise_conflict");
      exhausted.add(active);active=null;
      // A compromised signer cannot be reactivated in this packet. A separate
      // independently witnessed new packet is required to recover custody.
    }
    prior=e.eventHash;priorTime=time;
  }
  if(!active||exhausted.has(active))return denied("active_custody_missing");
  const key=roots.find(r=>r.keyId===active);
  if(!key||key.revokedKeyIds.includes(active))return denied("active_key_revoked");
  return {integrity:"verified",reasons:["cryptographic_chain_only","external_authority_unverified"],
    currentKey:active,finalHash:prior,releaseAllowed:false};
}
