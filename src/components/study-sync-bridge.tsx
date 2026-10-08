"use client";

import { useCallback, useEffect, useState } from "react";
import { flushPendingAttempts, listPendingAttempts, STUDY_SYNC_CHANGE_EVENT } from "@/lib/study/offline-attempts";
import { flushPendingSessionFinishes, flushPendingSessionStarts, pendingSessionCount } from "@/lib/study/offline-sessions";
import { currentPendingOwner } from "@/lib/study/pending-owner";

export function StudySyncBridge() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    const userId=await currentPendingOwner();
    setPending(userId?listPendingAttempts(userId).length+pendingSessionCount(userId):0);
  }, []);
  const sync = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) { await refreshCount(); return; }
    setSyncing(true);
    try {
      await flushPendingSessionStarts();
      await flushPendingAttempts();
      await flushPendingSessionFinishes();
    } finally {
      setSyncing(false);
      await refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    void refreshCount();
    void sync();
    const online = () => void sync();
    const changed = () => {void refreshCount();};
    window.addEventListener("online", online);
    window.addEventListener(STUDY_SYNC_CHANGE_EVENT, changed);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener(STUDY_SYNC_CHANGE_EVENT, changed);
    };
  }, [refreshCount, sync]);

  if (!pending && !syncing) return null;
  return <span className="sync-status" title="Locally queued study events">{syncing ? "Syncing…" : `${pending} pending`}</span>;
}
