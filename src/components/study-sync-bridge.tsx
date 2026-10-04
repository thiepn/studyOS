"use client";

import { useCallback, useEffect, useState } from "react";
import { flushPendingAttempts, listPendingAttempts, STUDY_SYNC_CHANGE_EVENT } from "@/lib/study/offline-attempts";
import { flushPendingSessionFinishes, flushPendingSessionStarts, pendingSessionCount } from "@/lib/study/offline-sessions";

export function StudySyncBridge() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(() => setPending(listPendingAttempts().length + pendingSessionCount()), []);
  const sync = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) { refreshCount(); return; }
    setSyncing(true);
    try {
      await flushPendingSessionStarts();
      await flushPendingAttempts();
      await flushPendingSessionFinishes();
    } finally {
      setSyncing(false);
      refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    void sync();
    const online = () => void sync();
    const changed = () => refreshCount();
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
