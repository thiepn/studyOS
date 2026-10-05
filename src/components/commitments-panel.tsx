"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CommitmentRow } from "@/lib/study/planning";

type Course={id:string;display_name:string;short_name:string|null};

export function CommitmentsPanel({commitments,courses}:{commitments:CommitmentRow[];courses:Course[]}){
  const router=useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState<string|null>(null);
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); const form=event.currentTarget; const fd=new FormData(form); setBusy(true);setMessage(null);
    try{
      const raw=String(fd.get("dueAt")??""); const date=new Date(raw); if(Number.isNaN(date.getTime())) throw new Error("Choose a due date and time.");
      const response=await fetch("/api/study/commitments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        title:fd.get("title"),dueAt:date.toISOString(),estimatedMinutes:Number(fd.get("minutes")),priority:Number(fd.get("priority")),
        kind:fd.get("kind"),courseId:fd.get("courseId")||null,sourceUrl:fd.get("sourceUrl")||null,note:fd.get("note")||null,
      })});
      const body=await response.json(); if(!response.ok) throw new Error(body?.error||"Could not add deadline");
      form.reset(); setMessage("Deadline added."); router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not add deadline");}finally{setBusy(false);}
  }
  async function status(id:string,next:"completed"|"cancelled"){
    setBusy(true);setMessage(null);
    try{
      const response=await fetch("/api/study/commitments/"+id+"/status",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({status:next})});
      const body=await response.json(); if(!response.ok) throw new Error(body?.error||"Could not update deadline");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not update deadline");}finally{setBusy(false);}
  }
  return <section className="panel commitments-panel">
    <div className="section-heading"><div><p className="eyebrow">Deadlines</p><h2>Commitments</h2></div><span>{commitments.length}</span></div>
    {commitments.length?<div className="commitment-list">{commitments.map((item)=>{
      const due=new Date(item.due_at); const overdue=due.getTime()<Date.now();
      return <article key={item.id} className={overdue?"commitment overdue":"commitment"}>
        <div><strong>{item.title}</strong><span>{item.course_short_name??item.course_name??"Semester"} · {due.toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}</span></div>
        <div className="commitment-meta"><span>{item.estimated_minutes} min</span><span>P{item.priority}</span>{overdue?<span className="urgent-tag">overdue</span>:null}</div>
        <div className="commitment-actions">{item.source_url?<a href={item.source_url} target="_blank" rel="noreferrer">source</a>:null}<button type="button" disabled={busy} onClick={()=>void status(item.id,"completed")}>Done</button><button type="button" disabled={busy} onClick={()=>void status(item.id,"cancelled")}>Cancel</button></div>
      </article>;
    })}</div>:<p className="muted">No open deadlines are registered.</p>}
    <details className="commitment-add"><summary>Add deadline or commitment</summary>
      <form onSubmit={create}>
        <div className="commitment-form-grid">
          <label className="wide"><span>Title</span><input name="title" required maxLength={240} placeholder="Stochastik Übungsblatt 2"/></label>
          <label><span>Course</span><select name="courseId" defaultValue=""><option value="">Semester-wide</option>{courses.map((course)=><option key={course.id} value={course.id}>{course.display_name}</option>)}</select></label>
          <label><span>Type</span><select name="kind" defaultValue="assignment"><option value="assignment">Assignment</option><option value="deadline">Deadline</option><option value="exam">Exam</option><option value="administrative">Administrative</option><option value="other">Other</option></select></label>
          <label><span>Due</span><input name="dueAt" type="datetime-local" required/></label>
          <label><span>Estimate</span><input name="minutes" type="number" min="5" max="720" step="5" defaultValue="45"/></label>
          <label><span>Priority</span><select name="priority" defaultValue="3">{[1,2,3,4,5].map((n)=><option key={n} value={n}>{n}/5</option>)}</select></label>
          <label className="wide"><span>Source URL <em>optional</em></span><input name="sourceUrl" inputMode="url" placeholder="https://…"/></label>
          <label className="wide"><span>Note <em>optional</em></span><input name="note" maxLength={4000}/></label>
        </div>
        <button className="secondary-button button-reset" type="submit" disabled={busy}>{busy?"Saving…":"Add commitment"}</button>
      </form>
    </details>
    {message?<p className="form-message" role="status">{message}</p>:null}
  </section>;
}
