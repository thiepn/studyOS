"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExamMetadataForm({examId,relevance,active,notes}:{examId:string;relevance:number;active:boolean;notes:string|null}){
  const router=useRouter(); const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false); const [message,setMessage]=useState<string|null>(null);
  const [pct,setPct]=useState(Math.round(relevance*100)); const [enabled,setEnabled]=useState(active); const [note,setNote]=useState(notes??"");
  async function save(){
    setBusy(true); setMessage(null);
    try{
      const response=await fetch("/api/study/exams/"+examId+"/metadata",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({syllabusRelevance:pct/100,active:enabled,notes:note})});
      const body=await response.json(); if(!response.ok) throw new Error(body?.error||"Could not update paper");
      setMessage("Updated."); router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not update paper");}finally{setBusy(false);}
  }
  return <div className="exam-meta">
    <button className="secondary-button button-reset" type="button" onClick={()=>setOpen((v)=>!v)}>{open?"Close":"Paper settings"}</button>
    {open?<div className="exam-meta-editor">
      <label><span>Syllabus relevance</span><input type="number" min="0" max="100" step="5" value={pct} onChange={(e)=>setPct(Number(e.target.value))}/><small>%</small></label>
      <label className="check-row"><input type="checkbox" checked={enabled} onChange={(e)=>setEnabled(e.target.checked)}/><span>Include in blueprint</span></label>
      <label><span>Notes</span><input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="e.g. old syllabus section 4 obsolete"/></label>
      <button className="secondary-button button-reset" type="button" disabled={busy||pct<0||pct>100} onClick={()=>void save()}>{busy?"Saving…":"Save"}</button>
      {message?<span className="form-message">{message}</span>:null}
    </div>:null}
  </div>;
}
