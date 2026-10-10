"use client";

import {useState} from "react";
import {OFFLINE_QUEUE_KEYS,inspectOfflineCustody,type OfflineQueueRaw} from "@/lib/study/offline-recovery";
import {currentPendingOwner} from "@/lib/study/pending-owner";
import {redactedRecoveryHandoff} from "@/lib/study/recovery-handoff";
import {RECOVERY_REVIEW_ITEMS,reviewReadiness,type RecoveryReviewItemId} from "@/lib/study/recovery-acceptance-guide";

export function RecoveryAcceptanceGuide({verifiedOwnerId,activeSemesterPresent}:{
  verifiedOwnerId:string;activeSemesterPresent:boolean;
}){
  const [checked,setChecked]=useState<ReadonlySet<RecoveryReviewItemId>>(()=>new Set());
  const [copyStatus,setCopyStatus]=useState<string|null>(null);
  const [copying,setCopying]=useState(false);
  async function copySafeHandoff(){
    if(copying)return;
    setCopying(true);setCopyStatus(null);
    try{
      const raw={} as OfflineQueueRaw;
      for(const key of OFFLINE_QUEUE_KEYS)raw[key]=window.localStorage.getItem(key);
      const browserOwner=await currentPendingOwner();
      const custody=inspectOfflineCustody(raw,verifiedOwnerId,browserOwner);
      const summary=redactedRecoveryHandoff({custody,checked,activeSemesterPresent});
      if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable in this browser.");
      await navigator.clipboard.writeText(summary);
      setCopyStatus("Redacted handoff copied. Review it before sharing with an independent operator.");
    }catch{
      setCopyStatus("Could not copy the handoff. Local data has not been sent; verify browser clipboard access.");
    }finally{setCopying(false);}
  }
  const readiness=reviewReadiness(checked);
  return <section className="account-recovery-acceptance" aria-labelledby="recovery-acceptance-title">
    <p className="section-kicker">Independent handoff / local review only</p>
    <h2 id="recovery-acceptance-title">Recovery evidence checklist</h2>
    <p>This preparation checklist is not an attestation. Tick items only after confirming originals with the responsible external operators. No data leaves this page automatically; only the explicit copy action writes a redacted summary to your clipboard. Checklist entries are not persisted.</p>
    <fieldset>
      <legend>Evidence to hand off before any recovery or release decision</legend>
      {RECOVERY_REVIEW_ITEMS.map(item=><label key={item.id}>
        <input type="checkbox" checked={checked.has(item.id)}
          onChange={event=>{
            const next=new Set(checked);
            if(event.target.checked)next.add(item.id);else next.delete(item.id);
            setChecked(next);
          }}/>
        <span>{item.label}</span>
      </label>)}
    </fieldset>
    <p role="status" aria-live="polite">
      <strong>{readiness.status==="REVIEW_PENDING"?"Evidence still needed":"Ready to request independent review (not approved)"}</strong>
      {" · "}{readiness.remaining.length} checklist item(s) remain. {readiness.note}
    </p>
    <div className="button-row">
      <button type="button" className="secondary-button button-reset" disabled={copying}
        onClick={()=>void copySafeHandoff()}>
        {copying?"Checking local custody…":"Copy redacted handoff summary"}
      </button>
    </div>
    {copyStatus?<p role="status" aria-live="polite">{copyStatus}</p>:null}
    <p><strong>Restore: NO_GO · Staging: NO_GO · Release: NO_GO · Postrelease: NO_GO.</strong> Actual external original-byte custody, physical testing and owner decisions remain required.</p>
  </section>;
}
