"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExamClosureButton({courseId,label="Close exam & reallocate"}:{courseId:string;label?:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  async function closeExam(){
    setBusy(true);setMessage(null);
    try{
      const response=await fetch("/api/study/exam-operations/close",{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({courseId}),
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error||"Could not close exam operations");
      const released=Number(result?.data?.releasedMinutes??0);
      const cancelled=Number(result?.data?.cancelledBlocks??0);
      const warningCount=Array.isArray(result?.data?.calendarErrors)?result.data.calendarErrors.length:0;
      setMessage(
        (released?released+" weekly min released. ":"No weekly minutes required release. ")+
        (cancelled?cancelled+" obsolete calendar block"+(cancelled===1?"":"s")+" cancelled. ":"")+
        (warningCount?warningCount+" calendar cancellation warning"+(warningCount===1?"":"s")+".":"")
      );
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Could not close exam operations");
    }finally{setBusy(false);}
  }

  return <div className="exam-close-control">
    <button className="primary-button button-reset" type="button" disabled={busy} onClick={()=>void closeExam()}>{busy?"Closing…":label}</button>
    {message?<p className="form-message" role="status">{message}</p>:null}
  </div>;
}
