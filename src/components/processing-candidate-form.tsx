"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProcessingCandidateForm({ runId, resourceTitle, courseName }: { runId: string; resourceTitle: string; courseName: string; }) {
  const router = useRouter();
  const [brief, setBrief] = useState<string | null>(null);
  const [candidate, setCandidate] = useState("");
  const [busy, setBusy] = useState<"brief" | "submit" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadBrief(copy = false) {
    setBusy("brief"); setMessage(null);
    try {
      const response = await fetch("/api/study/ingestion/" + runId + "/packet", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Could not prepare processing brief");
      const text = String(body.data.brief);
      setBrief(text);
      if (copy) {
        await navigator.clipboard.writeText(text);
        setMessage("Processing brief copied. Use it with the source PDF in ChatGPT, then paste the JSON result below.");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not prepare processing brief"); }
    finally { setBusy(null); }
  }

  async function submit() {
    setBusy("submit"); setMessage(null);
    try {
      let payload: unknown;
      try { payload = JSON.parse(candidate); } catch { throw new Error("Candidate is not valid JSON."); }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Candidate must be a JSON object.");
      const response = await fetch("/api/study/ingestion/" + runId + "/candidate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload, processor: "chatgpt-assisted-manual", processorVersion: "p9", extractionConfidence: 0.9, validationIssues: [] }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Could not submit candidate");
      setMessage("Candidate validated. Review warnings/errors before accepting it into the study map.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not submit candidate"); }
    finally { setBusy(null); }
  }

  return (
    <article className="processing-card">
      <div className="status-line"><div><strong>{resourceTitle}</strong><p>{courseName}</p></div><span>queued</span></div>
      <p className="muted">StudyOS does not call a paid model automatically. Generate a source-grounded candidate with the processing brief, then import the JSON here.</p>
      <div className="button-row">
        <button className="primary-button button-reset" type="button" disabled={Boolean(busy)} onClick={() => void loadBrief(true)}>{busy === "brief" ? "Preparing…" : "Copy processing brief"}</button>
        <button className="secondary-button button-reset" type="button" disabled={Boolean(busy)} onClick={() => void loadBrief(false)}>Show brief</button>
      </div>
      {brief ? <details className="processing-brief"><summary>Processing brief</summary><pre>{brief}</pre></details> : null}
      <label className="candidate-label"><span>Candidate JSON</span><textarea value={candidate} onChange={(event) => setCandidate(event.target.value)} rows={10} placeholder='{"schema_version":"studyos-processing-v1","topics":[...]}' /></label>
      <div className="button-row"><button className="secondary-button button-reset" type="button" disabled={busy !== null || !candidate.trim()} onClick={() => void submit()}>{busy === "submit" ? "Validating…" : "Validate candidate"}</button></div>
      {message ? <p className="form-message" role="status">{message}</p> : null}
    </article>
  );
}