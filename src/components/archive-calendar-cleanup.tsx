"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArchiveCalendarCleanup({semesterId,count}:{semesterId:string;count:number}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [confirmed,setConfirmed]=useState(false);
  async function run(){
    if(!confirmed||busy)return;
    setBusy(true);setMessage(null);
    try{
      const response=await fetch("/api/study/semester-archive/cleanup",{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({semesterId}),
      });
      const payload=await response.json();
      if(!response.ok)throw new Error(payload?.error||"Could not clean up calendar blocks");
      const errors=Array.isArray(payload?.data?.errors)?payload.data.errors:[];
      setMessage(String(payload?.data?.cancelled??0)+" block(s) cancelled"+(errors.length?"; "+errors.length+" still need attention.":"."));
      setConfirmed(false);router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not clean up calendar blocks");}
    finally{setBusy(false);}
  }
  if(count<=0)return null;
  return <div className="archive-cleanup">
    <details className="semester-remove-prior-review">
      <summary>Review outstanding archived Calendar cleanup ({count})</summary>
      <p>This may delete actual Google Calendar events belonging to the archived semester. The archived academic ledger is retained. Confirm only after checking the target account and events.</p>
      <label className="semester-review-confirm">
        <input type="checkbox" checked={confirmed} disabled={busy}
          onChange={event=>setConfirmed(event.target.checked)}/>
        <span>I reviewed the archived semester and authorize attempting deletion of its remaining future StudyOS Calendar events.</span>
      </label>
      <button className="secondary-button button-reset" type="button" disabled={busy||!confirmed}
        onClick={()=>void run()}>{busy?"Cleaning…":"Confirm Calendar cleanup ("+count+")"}</button>
      {message?<p className="form-message" role="status">{message}</p>:null}
    </details>
  </div>;
}
