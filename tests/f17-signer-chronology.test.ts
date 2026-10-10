import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign,type KeyObject} from "node:crypto";
import {auditF17SignerChronology} from "../scripts/f17-signer-chronology.mjs";
const H="a".repeat(40),when="2026-10-10T15:00:00Z",now=new Date("2026-10-10T15:40:00Z");
const sha=(x:Buffer)=>createHash("sha256").update(x).digest("hex");
function fixture(){
  const keys=new Map<string,KeyObject>();
  const roots=["k-one","k-two","k-three"].map((keyId,i)=>{
    const kp=generateKeyPairSync("ed25519");
    keys.set(keyId,kp.privateKey);
    return {role:"custodian",status:"trusted",actorId:"actor-"+i,keyId,
      publicKeyPem:kp.publicKey.export({format:"pem",type:"spki"}).toString(),revokedKeyIds:[]};
  });
  const events:any[]=[];
  function add(action:string,previousKeyId:string|null,nextKeyId:string|null,keyId:string,occurredAt=when){
    const unsigned:any={head:H,sequence:events.length+1,
      previousHash:events.at(-1)?.eventHash??"0".repeat(64),
      action,previousKeyId,nextKeyId,custodianKeyId:keyId,
      custodianId:roots.find(r=>r.keyId===keyId)!.actorId,occurredAt};
    const msg=Buffer.from(JSON.stringify(unsigned));
    events.push({...unsigned,eventHash:sha(msg),signature:sign(null,msg,keys.get(keyId)!).toString("base64")});
  }
  add("activate",null,"k-one","k-one");
  return {roots,events,add};
}
const inspect=(f:ReturnType<typeof fixture>)=>auditF17SignerChronology({...f,head:H,now});
test("one independently signed synthetic activation verifies integrity but never grants release",()=>{
  const x=fixture(),r=inspect(x);
  assert.equal(r.integrity,"verified");assert.equal(r.currentKey,"k-one");
  assert.equal(r.releaseAllowed,false);assert.match(r.reasons.join(),/external_authority_unverified/);
});
test("signed rotation makes the prior signer unavailable for reactivation",()=>{
  const x=fixture();x.add("rotate","k-one","k-two","k-one");
  assert.equal(inspect(x).currentKey,"k-two");
  x.add("rotate","k-two","k-one","k-two");
  assert.equal(inspect(x).reasons[0],"rotation_conflict");
});
test("signed compromise makes the entire packet fail closed until new independent custody",()=>{
  const x=fixture();x.add("compromise","k-one",null,"k-one");
  const r=inspect(x);assert.equal(r.integrity,"rejected");
  assert.equal(r.reasons[0],"active_custody_missing");assert.equal(r.releaseAllowed,false);
});
test("revocation conflicts and already-revoked roots fail closed",()=>{
  const x=fixture();x.add("revoke","k-two",null,"k-one");
  assert.equal(inspect(x).reasons[0],"revoke_or_compromise_conflict");
  const y=fixture();y.roots[0].revokedKeyIds.push("k-one");
  assert.equal(inspect(y).reasons[0],"custody_hash_signature_or_revocation");
});
test("tampered sequence, head, timestamp and detached signature never verify",()=>{
  const x=fixture();x.events[0].previousHash="f".repeat(64);
  assert.equal(inspect(x).reasons[0],"chain_order_or_shape");
  const y=fixture();y.events[0].occurredAt="2025-01-01T00:00:00Z";
  assert.equal(inspect(y).reasons[0],"chronology_invalid");
  const z=fixture();z.events[0].signature="AA==";
  assert.equal(inspect(z).reasons[0],"custody_hash_signature_or_revocation");
  assert.equal(auditF17SignerChronology({...fixture(),head:"b".repeat(40),now}).reasons[0],"chain_order_or_shape");
});
test("two distinct signed keys cannot be reused by the same actor",()=>{
  const x=fixture();x.roots[1].actorId=x.roots[0].actorId;
  assert.equal(inspect(x).reasons[0],"invalid_external_roots");
});
