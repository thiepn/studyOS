"use client";

import {useCallback,useEffect,useState} from "react";
import {OFFLINE_QUEUE_KEYS,inspectOfflineCustody,offlineCustodyExplanation,type OfflineCustody,type OfflineQueueRaw} from "@/lib/study/offline-recovery";
import {currentPendingOwner} from "@/lib/study/pending-owner";
import {flushPendingAttempts,STUDY_SYNC_CHANGE_EVENT} from "@/lib/study/offline-attempts";
import {flushPendingSessionStarts,flushPendingSessionFinishes} from "@/lib/study/offline-sessions";

function localQueueSnapshot():OfflineQueueRaw|null{
  try{
    const rows={} as OfflineQueueRaw;
    for(const key of OFFLINE_QUEUE_KEYS)rows[key]=window.localStorage.getItem(key);
    return rows;
  }catch{return null;}
}
export function AccountOfflineRecovery({verifiedOwnerId}:{verifiedOwnerId:string}){
  const [custody,setCustody]=useState<OfflineCustody|null>(null);
  const [online,setOnline]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const inspect=useCallback(async()=>{
    const clientOwner=await currentPendingOwner();
    const result=inspectOfflineCustody(localQueueSnapshot(),verifiedOwnerId,clientOwner);
    setCustody(result);
    setOnline(navigator.onLine);
    return result;
  },[verifiedOwnerId]);
  useEffect(()=>{
    void inspect();
    const changed=()=>{void inspect();};
    window.addEventListener(STUDY_SYNC_CHANGE_EVENT,changed);
    window.addEventListener("online",changed);
    window.addEventListener("offline",changed);
    // Other tabs write browser storage without dispatching this tab's custom event.
    const changedStorage=(event:StorageEvent)=>{if(event.key===null||OFFLINE_QUEUE_KEYS.some(key=>key===event.key))void inspect();};
    window.addEventListener("storage",changedStorage);
    return ()=>{
      window.removeEventListener(STUDY_SYNC_CHANGE_EVENT,changed);
      window.removeEventListener("online",changed);
      window.removeEventListener("offline",changed);
      window.removeEventListener("storage",changedStorage);
    };
  },[inspect]);
  async function retry(){
    if(busy||!online)return;
    setBusy(true);setMessage(null);
    try{
      const before=await inspect();
      if(!before.canRetry)throw new Error("Queue custody changed. No retry was attempted.");
      if(await currentPendingOwner()!==verifiedOwnerId)throw new Error("Account changed; queue retry stopped.");
      await flushPendingSessionStarts();
      if(await currentPendingOwner()!==verifiedOwnerId)throw new Error("Account changed during recovery; stopped before attempts.");
      await flushPendingAttempts();
      if(await currentPendingOwner()!==verifiedOwnerId)throw new Error("Account changed during recovery; stopped before session finishes.");
      await flushPendingSessionFinishes();
      const after=await inspect();
      setMessage(after.status==="ready"
        ?after.owned+" locally queued record(s) remain for this account. Check the corresponding study history for server acknowledgement."
        :"Recovery was interrupted by an account or storage change. No success is assumed.");
    }catch(error){setMessage(error instanceof Error?error.message:"Queue retry could not complete. Verify your account and try again.");}
    finally{setBusy(false);}
  }
  return <section className="account-offline-recovery" aria-labelledby="offline-recovery-heading">
    <div className="account-recovery-heading"><p className="section-kicker">Local study queue</p><h2 id="offline-recovery-heading">Recover work under the original owner</h2></div>
    <p>Attempts and session updates queued on this browser are not transferred when you sign into another THIEPN Account. This checks only queue ownership metadata, not academic answers.</p>
    {custody?<div role="status" aria-live="polite">
      <strong>{custody.status==="ready"?"Owner-matched queue":custody.status.replaceAll("_"," ")}</strong>
      <p>{offlineCustodyExplanation(custody)}</p>
      {custody.status==="ready"||custody.status==="legacy_unowned"
        ?<><p>{custody.owned} for current account · {custody.otherOwner} for other accounts · {custody.unowned} older unowned · {custody.total} local queue entries</p>
          <p>{custody.atCapacity?"Local queue capacity reached. New offline saves can fail. ":""}Approximate stored queue volume: {Math.ceil(custody.storageBytes/1024)} KiB (all local owners). Do not clear this storage before owner-controlled recovery.</p></>
        :null}
    </div>:<p role="status">Inspecting this browser's queue metadata. No writes are performed.</p>}
    <p>Connection: {online===null?"unverified":online?"browser reports online":"browser reports offline"}. Being online does not prove the StudyOS server acknowledged an update.</p>
    <div className="button-row">
      <button type="button" className="primary-button button-reset"
        disabled={busy||online!==true||!custody?.canRetry} onClick={()=>void retry()}>
        {busy?"Retrying owner-matched records…":"Retry this account's queued records"}
      </button>
      <button type="button" className="secondary-button button-reset" disabled={busy} onClick={()=>void inspect()}>Recheck local custody</button>
    </div>
    {message?<p role="status" aria-live="polite">{message}</p>:null}
    <p className="muted">Do not clear browser storage, switch owners mid-retry, or interpret an empty queue as independent proof of completed study work.</p>
  </section>;
}
