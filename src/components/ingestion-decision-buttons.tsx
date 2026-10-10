"use client";

import { useRouter } from "next/navigation";
import {useState} from "react";

export function IngestionDecisionButtons({runId,disableAccept=false}:{
  runId:string;disableAccept?:boolean;
}){
  const router=useRouter();
  const [busy,setBusy]=useState<"accept"|"reject"|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [reviewed,setReviewed]=useState(false);
  const [rejectReason,setRejectReason]=useState("");
  async function decide(action:"accept"|"reject"){
    if(action==="accept"&&(disableAccept||!reviewed))return;
    if(action==="reject"&&!rejectReason.trim())return;
    setBusy(action);setError(null);
    try{
      const response=await fetch(`/api/study/ingestion/${runId}/decision`,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({action,reason:action==="reject"?rejectReason.trim():undefined}),
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body?.error||`Could not ${action}`);
      router.refresh();
    }catch(caught){setError(caught instanceof Error?caught.message:"Decision failed");}
    finally{setBusy(null);}
  }
  return <div className="source-decision">
    <p className="resource-stage-help">Acceptance applies the existing server-validated candidate to your study map; it does not certify licenses, identity, grades or publication. Rejection keeps it out of the map.</p>
    {disableAccept?<p role="note" className="source-decision-blocked">Acceptance blocked by validation errors. Inspect and repair the candidate; rejection remains available.</p>:null}
    <label className="source-review-confirmation">
      <input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}
        disabled={Boolean(busy)||disableAccept}/>
      <span>I reviewed this candidate, its source and validation findings. This is a local acceptance action, not independent certification.</span>
    </label>
    <div className="button-row">
      <button className="primary-button button-reset" disabled={busy!==null||disableAccept||!reviewed}
        onClick={()=>void decide("accept")} type="button">
        {busy==="accept"?"Accepting…":"Accept validated candidate"}
      </button>
    </div>
    <details className="source-reject-options">
      <summary>Reject candidate with a reason</summary>
      <label><span>Reason for rejection</span>
        <textarea value={rejectReason} onChange={event=>setRejectReason(event.target.value)}
          maxLength={1000} rows={3} placeholder="e.g. Unsupported theorem citation or insufficient source rights" />
      </label>
      <button className="secondary-button button-reset" disabled={busy!==null||!rejectReason.trim()}
        type="button" onClick={()=>void decide("reject")}>
        {busy==="reject"?"Rejecting…":"Reject candidate"}
      </button>
    </details>
    {error?<p className="error" role="alert">{error}</p>:null}
  </div>;
}
