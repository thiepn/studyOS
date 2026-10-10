"use client";

import {useCallback,useState} from "react";
import {currentPendingOwner} from "@/lib/study/pending-owner";
import {OFFLINE_QUEUE_KEYS,type OfflineQueueRaw} from "@/lib/study/offline-recovery";
import {recoveryInventory,rehearsePriorState,type RecoveryInventory,type RecoveryRehearsal} from "@/lib/study/prior-state-rehearsal";

function snapshot():OfflineQueueRaw|null{
  try{
    const source={} as OfflineQueueRaw;
    for(const key of OFFLINE_QUEUE_KEYS)source[key]=window.localStorage.getItem(key);
    return source;
  }catch{return null;}
}
export function PriorStateRehearsal({verifiedOwnerId,activeSemesterId}:{
  verifiedOwnerId:string;activeSemesterId:string|null;
}){
  const [prior,setPrior]=useState<RecoveryInventory|null>(null);
  const [result,setResult]=useState<RecoveryRehearsal|null>(null);
  const [busy,setBusy]=useState(false);
  const observe=useCallback(async()=>{
    const browserOwner=await currentPendingOwner();
    return recoveryInventory(snapshot(),verifiedOwnerId,browserOwner,activeSemesterId);
  },[verifiedOwnerId,activeSemesterId]);
  async function record(){
    if(busy)return;setBusy(true);
    try{
      const inventory=await observe();
      if(!inventory.ownerConfirmed||inventory.status!=="ready"||inventory.otherOwner||inventory.unowned){
        setPrior(null);
        setResult({decision:"BLOCKED",reasons:["Owner or local queue custody is not qualified for a prior-state rehearsal."],
          canRestore:false,canPurge:false,canRelease:false});
      }else{setPrior(inventory);setResult(null);}
    }finally{setBusy(false);}
  }
  async function compare(){
    if(busy)return;setBusy(true);
    try{setResult(rehearsePriorState(prior,await observe()));}
    finally{setBusy(false);}
  }
  return <section className="account-prior-state" aria-labelledby="prior-state-rehearsal-title">
    <p className="section-kicker">Source custody / read-only</p>
    <h2 id="prior-state-rehearsal-title">Prior-state recovery rehearsal</h2>
    <p>Record this browser's owner-matched queue count and current semester, then compare after recovering a tab or returning to work. This does not save original academic answers, create a backup, restore data, or confirm server delivery.</p>
    <div className="button-row">
      <button type="button" className="secondary-button button-reset" onClick={()=>void record()} disabled={busy}>Record local baseline</button>
      <button type="button" className="secondary-button button-reset" onClick={()=>void compare()} disabled={busy||!prior}>Compare current state</button>
    </div>
    <p role="status" aria-live="polite">{prior
      ?"Local baseline: "+prior.owned+" owner-matched queued entries. No raw study data retained in this view."
      :"No independently verified prior-state backup is present."}</p>
    {result?<div className="account-prior-state-result" role={result.decision==="BLOCKED"?"alert":"status"} aria-live="polite">
      <strong>{result.decision==="UNCHANGED"?"Counts unchanged":result.decision==="BLOCKED"?"Recovery blocked":"Manual reconciliation required"}</strong>
      {result.reasons.map(reason=><p key={reason}>{reason}</p>)}
      <p>No automatic restore, overwrite, purge or release is permitted.</p>
    </div>:null}
  </section>;
}
