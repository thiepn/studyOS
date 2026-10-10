"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushPendingAttempts, listPendingAttempts, STUDY_SYNC_CHANGE_EVENT } from "@/lib/study/offline-attempts";
import { flushPendingSessionFinishes, flushPendingSessionStarts, pendingSessionCount } from "@/lib/study/offline-sessions";
import { currentPendingOwner } from "@/lib/study/pending-owner";
import {OFFLINE_QUEUE_KEYS,inspectOfflineCustody,type OfflineCustody,type OfflineQueueRaw} from "@/lib/study/offline-recovery";

export function StudySyncBridge() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [queueWarning,setQueueWarning]=useState<string|null>(null);
  const inProgress=useRef(false);
  const inspect=useCallback((userId:string):OfflineCustody=>{
    let raw:OfflineQueueRaw|null=null;
    try{
      raw={} as OfflineQueueRaw;
      for(const key of OFFLINE_QUEUE_KEYS)raw[key]=window.localStorage.getItem(key);
    }catch{raw=null;}
    return inspectOfflineCustody(raw,userId,userId);
  },[]);
  const refreshCount = useCallback(async () => {
    const userId=await currentPendingOwner();
    if(!userId){setPending(0);setQueueWarning(null);return;}
    const custody=inspect(userId);
    setQueueWarning(custody.status!=="ready"?
      "Local queue needs owner recovery":custody.atCapacity?"Local queue full":null);
    setPending(custody.status==="ready"?listPendingAttempts(userId).length+pendingSessionCount(userId):0);
  }, [inspect]);
  const sync = useCallback(async () => {
    if(inProgress.current)return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { await refreshCount(); return; }
    inProgress.current=true;
    setSyncing(true);
    const startingOwner=await currentPendingOwner();
    try {
      if(!startingOwner||!inspect(startingOwner).canRetry)return;
      await flushPendingSessionStarts();
      if(await currentPendingOwner()!==startingOwner)return;
      await flushPendingAttempts();
      if(await currentPendingOwner()!==startingOwner)return;
      await flushPendingSessionFinishes();
    } finally {
      inProgress.current=false;
      setSyncing(false);
      await refreshCount();
    }
  }, [refreshCount,inspect]);

  useEffect(() => {
    void refreshCount();
    void sync();
    const online = () => void sync();
    const changed = () => {void refreshCount();};
    window.addEventListener("online", online);
    window.addEventListener(STUDY_SYNC_CHANGE_EVENT, changed);
    const storageChanged=(event:StorageEvent)=>{if(event.key?.startsWith("semester-os:pending-"))changed();};
    window.addEventListener("storage",storageChanged);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener(STUDY_SYNC_CHANGE_EVENT, changed);
      window.removeEventListener("storage",storageChanged);
    };
  }, [refreshCount, sync]);

  if (!pending && !syncing&&!queueWarning) return null;
  return <span className="sync-status" role="status" aria-live="polite" title="Locally queued study events">
    {syncing?"Syncing…":queueWarning??`${pending} pending`}
    {queueWarning?<a href="/account/recovery">Review local custody</a>:null}
  </span>;
}
