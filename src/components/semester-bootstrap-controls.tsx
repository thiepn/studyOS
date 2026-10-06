"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Course={courseId:string;displayName:string;shortName:string|null;courseKind:string};
type PriorOption={id:string;semester_id:string;semester_name:string;display_name:string;short_name:string|null;course_kind:string;stable_key:string};

export function BootstrapCourseForm(){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage(null);
    const fd=new FormData(event.currentTarget);
    const rawExam=String(fd.get("examAt")??"").trim();
    try{
      const response=await fetch("/api/study/semester-bootstrap/course",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({
          stableKey:fd.get("stableKey"),displayName:fd.get("displayName"),shortName:fd.get("shortName"),
          courseKind:fd.get("courseKind"),professor:fd.get("professor"),credits:fd.get("credits"),
          examAt:rawExam?new Date(rawExam).toISOString():null,
          examDurationMinutes:fd.get("examDurationMinutes"),examFormat:fd.get("examFormat"),
          expectedLecturesPerWeek:fd.get("expectedLecturesPerWeek"),
          expectsExercise:fd.get("expectsExercise")==="on",expectsSolution:fd.get("expectsSolution")==="on",
        }),
      });
      const body=await response.json();if(!response.ok)throw new Error(body?.error||"Could not add course");
      event.currentTarget.reset();setMessage("Course added. Provision Drive again to create its folder.");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not add course");}
    finally{setBusy(false);}
  }
  return <form className="bootstrap-course-form" onSubmit={submit}>
    <label><span>Stable key</span><input required name="stableKey" pattern="[a-z0-9_]{2,80}" placeholder="analysis_iii"/></label>
    <label className="wide"><span>Course name</span><input required name="displayName" placeholder="Analysis III"/></label>
    <label><span>Short name</span><input name="shortName" placeholder="Ana III"/></label>
    <label><span>Kind</span><select name="courseKind" defaultValue="major"><option value="major">Major</option><option value="minor">Minor</option><option value="retake">Retake</option></select></label>
    <label><span>Professor</span><input name="professor"/></label>
    <label><span>ECTS</span><input name="credits" type="number" min="0.5" max="60" step="0.5"/></label>
    <label><span>Exam</span><input name="examAt" type="datetime-local"/></label>
    <label><span>Duration (min)</span><input name="examDurationMinutes" type="number" min="15" max="600"/></label>
    <label><span>Exam format</span><input name="examFormat" placeholder="written, oral, coding…"/></label>
    <label><span>Lectures / week</span><input name="expectedLecturesPerWeek" type="number" min="0" max="7"/></label>
    <label className="check"><input name="expectsExercise" type="checkbox" defaultChecked/> Exercise expected</label>
    <label className="check"><input name="expectsSolution" type="checkbox" defaultChecked/> Official solution expected</label>
    <div className="wide button-row"><button className="primary-button button-reset" disabled={busy}>{busy?"Adding…":"Add course"}</button></div>
    {message?<p className="wide form-message" role="status">{message}</p>:null}
  </form>;
}

export function BootstrapPriorForm({courses,options}:{courses:Course[];options:PriorOption[]}){
  const router=useRouter();
  const [courseId,setCourseId]=useState(courses[0]?.courseId??"");
  const [sourceCourseId,setSourceCourseId]=useState(options[0]?.id??"");
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState<string|null>(null);
  const grouped=useMemo(()=>options,[options]);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage(null);
    const fd=new FormData(event.currentTarget);
    try{
      const response=await fetch("/api/study/semester-bootstrap/prior",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({courseId,sourceCourseId,relation:fd.get("relation"),note:fd.get("note")}),
      });
      const body=await response.json();if(!response.ok)throw new Error(body?.error||"Could not attach prior");
      setMessage("Historical prior attached as advisory context.");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not attach prior");}
    finally{setBusy(false);}
  }
  if(!courses.length||!options.length)return <p className="muted">Archived course evidence will appear here when both a current course and an archived source course are available.</p>;
  return <form className="bootstrap-prior-form" onSubmit={submit}>
    <label><span>Current course</span><select value={courseId} onChange={e=>setCourseId(e.target.value)}>{courses.map(c=><option value={c.courseId} key={c.courseId}>{c.shortName??c.displayName}</option>)}</select></label>
    <label><span>Archived source</span><select value={sourceCourseId} onChange={e=>setSourceCourseId(e.target.value)}>{grouped.map(o=><option value={o.id} key={o.id}>{o.semester_name} · {o.short_name??o.display_name}</option>)}</select></label>
    <label><span>Relationship</span><select name="relation" defaultValue="prerequisite"><option value="direct_retake">Direct retake · same stable key</option><option value="prerequisite">Prerequisite</option><option value="related">Related</option></select></label>
    <label className="wide"><span>Why this prior matters</span><textarea name="note" rows={2} maxLength={1000}/></label>
    <div className="wide button-row"><button className="secondary-button button-reset" disabled={busy}>{busy?"Attaching…":"Attach historical prior"}</button></div>
    {message?<p className="wide form-message">{message}</p>:null}
  </form>;
}

export function BootstrapActionButtons({ready,certified,driveConnected}:{ready:boolean;certified:boolean;driveConnected:boolean}){
  const router=useRouter();const [busy,setBusy]=useState<string|null>(null);const [message,setMessage]=useState<string|null>(null);
  async function post(path:string,key:string){
    setBusy(key);setMessage(null);
    try{
      const response=await fetch(path,{method:"POST"});const body=await response.json();
      if(!response.ok)throw new Error(body?.error||"Action failed");
      setMessage(key==="drive"?"Active-semester Drive folders provisioned.":"Semester bootstrap certified.");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Action failed");}
    finally{setBusy(null);}
  }
  return <div className="bootstrap-actions">
    {driveConnected?<button className="secondary-button button-reset" disabled={Boolean(busy)} onClick={()=>void post("/api/integrations/google-drive/provision","drive")}>{busy==="drive"?"Provisioning…":"Provision / repair semester Drive"}</button>:<a className="secondary-button" href="/api/integrations/google-drive/start">Connect Study Drive</a>}
    <button className="primary-button button-reset" disabled={!ready||certified||Boolean(busy)} onClick={()=>void post("/api/study/semester-bootstrap/certify","certify")}>{certified?"Bootstrap certified":busy==="certify"?"Certifying…":"Certify semester bootstrap"}</button>
    {message?<p className="form-message" role="status">{message}</p>:null}
  </div>;
}

export function RemovePriorButton({priorId}:{priorId:string}){
  const router=useRouter();const [busy,setBusy]=useState(false);
  async function remove(){
    setBusy(true);
    try{await fetch("/api/study/semester-bootstrap/prior",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({priorId})});router.refresh();}
    finally{setBusy(false);}
  }
  return <button className="link-button button-reset" disabled={busy} onClick={()=>void remove()}>{busy?"Removing…":"Remove"}</button>;
}
