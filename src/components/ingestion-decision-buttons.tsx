"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IngestionDecisionButtons({ runId, disableAccept = false }: { runId: string; disableAccept?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "accept" | "reject") {
    setBusy(action); setError(null);
    try {
      const response = await fetch(`/api/study/ingestion/${runId}/decision`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason: action === "reject" ? "Rejected from StudyOS review inbox" : undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || `Could not ${action}`);
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Decision failed"); }
    finally { setBusy(null); }
  }

  return <div><div className="button-row"><button className="primary-button button-reset" disabled={busy !== null || disableAccept} onClick={() => void decide("accept")} type="button">{busy === "accept" ? "Accepting…" : "Accept into study map"}</button><button className="secondary-button button-reset" disabled={busy !== null} onClick={() => void decide("reject")} type="button">{busy === "reject" ? "Rejecting…" : "Reject"}</button></div>{error ? <p className="error">{error}</p> : null}</div>;
}
