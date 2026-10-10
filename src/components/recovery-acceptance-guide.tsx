"use client";

import {useState} from "react";
import {RECOVERY_REVIEW_ITEMS,reviewReadiness,type RecoveryReviewItemId} from "@/lib/study/recovery-acceptance-guide";

export function RecoveryAcceptanceGuide(){
  const [checked,setChecked]=useState<ReadonlySet<RecoveryReviewItemId>>(()=>new Set());
  const readiness=reviewReadiness(checked);
  return <section className="account-recovery-acceptance" aria-labelledby="recovery-acceptance-title">
    <p className="section-kicker">Independent handoff / local review only</p>
    <h2 id="recovery-acceptance-title">Recovery evidence checklist</h2>
    <p>This preparation checklist is not an attestation. Tick items only after confirming originals with the responsible external operators. No data leaves this page; results do not persist after leaving.</p>
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
    <p><strong>Restore: NO_GO · Staging: NO_GO · Release: NO_GO · Postrelease: NO_GO.</strong> Actual external original-byte custody, physical testing and owner decisions remain required.</p>
  </section>;
}
