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
        if(!navigator.clipboard?.writeText)throw new Error("Clipboard access is unavailable. The brief is visible below; copy it manually.");
        await navigator.clipboard.writeText(text);
        setMessage("Processing brief copied. Review the original source PDF yourself before pasting any candidate JSON.");
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
        body: JSON.stringify({ payload, processor: "chatgpt-assisted-manual", processorVersion: "p9", validationIssues: [] }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Could not submit candidate");
      setMessage("Candidate submitted for validation. Inspect its generated topics, citations, questions, rubric evidence and warnings before any acceptance.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not submit candidate"); }
    finally { setBusy(null); }
  }

  return (
    <article className="processing-card">
      <div className="status-line"><div><strong>{resourceTitle}</strong><p>{courseName}</p></div><span>queued</span></div>
      <p className="muted">StudyOS does not call a paid model automatically. Compare a candidate against the original source and its rights before importing it. A manual submission has no automatically inferred extraction-confidence score.</p>
      <div className="button-row">
        <button className="primary-button button-reset" type="button" disabled={Boolean(busy)} onClick={() => void loadBrief(true)}>{busy === "brief" ? "Preparing…" : "Copy processing brief"}</button>
        <button className="secondary-button button-reset" type="button" disabled={Boolean(busy)} onClick={() => void loadBrief(false)}>Show brief</button>
      </div>
      {brief ? <details className="processing-brief"><summary>Processing brief</summary><pre>{brief}</pre></details> : null}
      <label className="candidate-label"><span>Candidate JSON · not yet approved</span><textarea value={candidate} onChange={(event) => setCandidate(event.target.value)} rows={10} spellCheck={false} aria-describedby={"candidate-instructions-"+runId} placeholder='{"schema_version":"studyos-processing-v1","topics":[...]}' /></label>
      <p id={"candidate-instructions-"+runId} className="resource-stage-help">A candidate is not verified because it is formatted as JSON. The server validates source evidence before anything may enter the study map.</p>
      <div className="button-row"><button className="secondary-button button-reset" type="button" disabled={busy !== null || !candidate.trim()} onClick={() => void submit()}>{busy === "submit" ? "Validating…" : "Validate candidate"}</button></div>
      {message ? <p className="form-message" role="status">{message}</p> : null}
    </article>
  );
}