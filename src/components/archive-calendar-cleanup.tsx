"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ArchiveCalendarCleanup({semesterId,count}:{semesterId:string;count:number}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  async function run(){
    setBusy(true);setMessage(null);
    try{
      const response=await fetch("/api/study/semester-archive/cleanup",{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({semesterId}),
      });
      const payload=await response.json();
      if(!response.ok)throw new Error(payload?.error||"Could not clean up calendar blocks");
      const errors=Array.isArray(payload?.data?.errors)?payload.data.errors:[];
      setMessage(String(payload?.data?.cancelled??0)+" block(s) cancelled"+(errors.length?"; "+errors.length+" still need attention.":"."));
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not clean up calendar blocks");}
    finally{setBusy(false);}
  }
  if(count<=0)return null;
  return <div className="archive-cleanup">
    <button className="secondary-button button-reset" type="button" disabled={busy} onClick={()=>void run()}>{busy?"Cleaning…":"Retry calendar cleanup ("+count+")"}</button>
    {message?<p className="form-message" role="status">{message}</p>:null}
  </div>;
}
