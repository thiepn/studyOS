"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { availablePresets } from "@/lib/study/semester-presets";
import {semesterDateValidation} from "@/lib/study/semester-management";

type Course={courseId:string;displayName:string;shortName:string|null;courseKind:string};
type PriorOption={id:string;semester_id:string;semester_name:string;display_name:string;short_name:string|null;course_kind:string;stable_key:string};


export function InitialSemesterForm(){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [timezone,setTimezone]=useState("Europe/Berlin");

  useEffect(()=>{
    const detected=Intl.DateTimeFormat().resolvedOptions().timeZone;
    if(detected)setTimezone(detected);
  },[]);

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage(null);
    const fd=new FormData(event.currentTarget);
    try{
      const dates=semesterDateValidation(String(fd.get("startsOn")??""),String(fd.get("endsOn")??""));
      if(dates)throw new Error(dates);
      const response=await fetch("/api/study/semester-bootstrap/semester",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({
          displayName:fd.get("displayName"),startsOn:fd.get("startsOn"),
          endsOn:fd.get("endsOn")||null,timezone:fd.get("timezone"),
        }),
      });
      const body=await response.json();
      if(response.status===409)router.refresh();
      if(!response.ok)throw new Error(body?.error||"Could not create semester");
      setMessage(body?.data?.recovered
        ?"The existing matching semester was recovered; no duplicate was created."
        :"Semester created. Add the real course roster next.");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not create semester");}
    finally{setBusy(false);}
  }

  return <form className="bootstrap-course-form initial-semester-form" onSubmit={submit}>
    <label className="wide"><span>Semester name</span><input required name="displayName" maxLength={80} placeholder="Wintersemester 2026/27"/></label>
    <label><span>Starts</span><input required name="startsOn" type="date"/></label>
    <label><span>Ends <em>optional</em></span><input name="endsOn" type="date"/></label>
    <label className="wide"><span>Timezone</span><input required name="timezone" value={timezone} onChange={event=>setTimezone(event.target.value)} maxLength={80}/></label>
    <div className="wide button-row"><button className="primary-button button-reset" disabled={busy}>{busy?"Creating…":"Create semester workspace"}</button></div>
    {message?<p className="wide form-message" role="status">{message}</p>:null}
  </form>;
}

export function BootstrapCourseForm({existingCourseKeys=[]}:{existingCourseKeys?:string[]}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [presetId,setPresetId]=useState<string|null>(null);
  const available=availablePresets(existingCourseKeys);
  const preset=available.find(option=>option.id===presetId);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage(null);
    const form=event.currentTarget;
    const fd=new FormData(form);
    const rawExam=String(fd.get("examAt")??"").trim();
    try{
      if(rawExam && Number.isNaN(Date.parse(rawExam)))throw new Error("Select a valid exam date and time.");
      const nameKey=String(fd.get("displayName")??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,65);
      const response=await fetch("/api/study/semester-bootstrap/course",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({
          stableKey:fd.get("stableKey")||"course_"+(nameKey||crypto.randomUUID().slice(0,8)),displayName:fd.get("displayName"),shortName:fd.get("shortName"),
          courseKind:fd.get("courseKind"),professor:fd.get("professor"),credits:fd.get("credits"),
          examAt:rawExam?new Date(rawExam).toISOString():null,
          examDurationMinutes:fd.get("examDurationMinutes"),examFormat:fd.get("examFormat"),
          expectedLecturesPerWeek:fd.get("expectedLecturesPerWeek"),
          expectsExercise:fd.get("expectsExercise")==="on",expectsSolution:fd.get("expectsSolution")==="on",
          sortOrder:fd.get("sortOrder"),
        }),
      });
      const body=await response.json();
      if(response.status===409)router.refresh();
      if(!response.ok||body?.ok!==true)throw new Error(body?.error||"Could not add course");
      form.reset();setPresetId(null);
      setMessage("Course added. Review source links and provision its Drive folder.");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not add course");}
    finally{setBusy(false);}
  }
  return <div className="study-course-add">
    <div className="study-course-presets" role="group" aria-label="Optional third-semester course templates">
      <span className="section-kicker">Optional third-semester templates</span>
      <div className="study-course-preset-options">
        {available.map(option=><button className={presetId===option.id?"selected":""}
          type="button" key={option.id} disabled={busy} aria-pressed={presetId===option.id}
          onClick={()=>{setPresetId(option.id);setMessage(null);}}>{option.shortName}</button>)}
        <button type="button" disabled={busy} aria-pressed={presetId===null}
          className={presetId===null?"selected":""} onClick={()=>{setPresetId(null);setMessage(null);}}>Custom</button>
      </div>
      <p>Choose a template to fill the form, then review and submit it. Nothing is created automatically. Exam dates, ECTS, lecturers and actual syllabi remain yours to verify.</p>
    </div>
    <form key={presetId??"custom"} className="bootstrap-course-form" onSubmit={submit}>
      <label className="wide"><span>Course name</span><input required name="displayName"
        defaultValue={preset?.displayName??""} placeholder="Course title from university"/></label>
      <label><span>Short name</span><input name="shortName" defaultValue={preset?.shortName??""} placeholder="DGL"/></label>
      <details className="wide material-advanced"><summary>Course details (optional)</summary><div className="form-grid">
      <label><span>Reference key</span><input name="stableKey" pattern="[a-z0-9_]{2,80}" defaultValue={preset?.stableKey??""} placeholder="Generated from the course name"/></label>
      <label><span>Kind</span><select name="courseKind" defaultValue={preset?.courseKind??"major"}>
        <option value="major">Major</option><option value="minor">Minor</option><option value="retake">Retake</option>
      </select></label>
      <label><span>Professor</span><input name="professor"/></label>
      <label><span>ECTS</span><input name="credits" type="number" min="0.5" max="60" step="0.5"/></label>
      <label><span>Exam</span><input name="examAt" type="datetime-local"/></label>
      <label><span>Duration (min)</span><input name="examDurationMinutes" type="number" min="15" max="600"/></label>
      <label><span>Exam format</span><input name="examFormat" placeholder="written, oral, coding…"/></label>
      <label><span>Lectures / week</span><input name="expectedLecturesPerWeek" type="number" min="0" max="7"/></label>
      <input type="hidden" name="sortOrder" defaultValue={preset?.sortOrder??""}/>
      <label className="check"><input name="expectsExercise" type="checkbox" defaultChecked/> Exercise expected</label>
      <label className="check"><input name="expectsSolution" type="checkbox" defaultChecked/> Official solution expected</label>
      </div></details>
      <p className="wide muted tiny">Adding a course records its identity only. Drive folder, verified sources, questions and retake baseline are checked separately before semester certification.</p>
      <div className="wide button-row"><button className="primary-button button-reset" disabled={busy}>
        {busy?"Adding…":"Add course"}</button></div>
    </form>
    {message?<p className="form-message" role="status">{message}</p>:null}
  </div>;
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
      setMessage("Previous-semester context attached as advisory evidence.");router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not attach prior");}
    finally{setBusy(false);}
  }
  if(!courses.length||!options.length)return <p className="muted">Archived course evidence will appear here when both a current course and an archived source course are available.</p>;
  return <form className="bootstrap-prior-form" onSubmit={submit}>
    <label><span>Current course</span><select value={courseId} onChange={e=>setCourseId(e.target.value)}>{courses.map(c=><option value={c.courseId} key={c.courseId}>{c.shortName??c.displayName}</option>)}</select></label>
    <label><span>Archived source</span><select value={sourceCourseId} onChange={e=>setSourceCourseId(e.target.value)}>{grouped.map(o=><option value={o.id} key={o.id}>{o.semester_name} · {o.short_name??o.display_name}</option>)}</select></label>
    <label><span>Relationship</span><select name="relation" defaultValue="prerequisite"><option value="direct_retake">Direct retake · same stable key</option><option value="prerequisite">Prerequisite</option><option value="related">Related</option></select></label>
    <label className="wide"><span>Why this prior matters</span><textarea name="note" rows={2} maxLength={1000}/></label>
    <div className="wide button-row"><button className="secondary-button button-reset" disabled={busy}>{busy?"Attaching…":"Attach previous course"}</button></div>
    {message?<p className="wide form-message">{message}</p>:null}
  </form>;
}

export function BootstrapActionButtons({ready,certified,driveConnected}:{ready:boolean;certified:boolean;driveConnected:boolean}){
  const router=useRouter();
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(null);
  const [reviewed,setReviewed]=useState(false);
  async function post(path:string,key:string){
    if(key==="certify"&&(!ready||certified||!reviewed))return;
    setBusy(key);setMessage(null);
    try{
      const response=await fetch(path,{method:"POST",
        ...(key==="certify"?{headers:{"content-type":"application/json"},body:JSON.stringify({reviewed:true})}:{})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body?.error||"Action failed");
      setMessage(key==="drive"?"Semester Drive folders are ready.":"Semester setup confirmed by the server.");
      if(key==="certify")setReviewed(false);
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Action failed");}
    finally{setBusy(null);}
  }
  return <div className="bootstrap-actions">
    {driveConnected?<button className="secondary-button button-reset" type="button" disabled={Boolean(busy)}
      onClick={()=>void post("/api/integrations/google-drive/provision","drive")}>
      {busy==="drive"?"Provisioning…":"Provision / repair semester Drive"}
    </button>:<a className="secondary-button" href="/api/integrations/google-drive/start">Connect Study Drive</a>}
    {!certified?<label className="semester-review-confirm">
      <input type="checkbox" checked={reviewed} disabled={!ready||Boolean(busy)}
        onChange={event=>setReviewed(event.target.checked)}/>
      <span>I inspected the real roster, current-semester Drive folders, verified curriculum and fresh retake baselines. I authorize requesting server-side certification.</span>
    </label>:<p role="status">This semester's setup is already certified in the database.</p>}
    <button className="primary-button button-reset" type="button" disabled={!ready||certified||!reviewed||Boolean(busy)}
      onClick={()=>void post("/api/study/semester-bootstrap/certify","certify")}>
      {certified?"Setup confirmed":busy==="certify"?"Certifying…":"Confirm reviewed semester setup"}
    </button>
    {message?<p className="form-message" role="status" aria-live="polite">{message}</p>:null}
  </div>;
}

export function RemovePriorButton({priorId}:{priorId:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const [error,setError]=useState<string|null>(null);
  async function remove(){
    if(!confirmed||busy)return;
    setBusy(true);setError(null);
    try{
      const response=await fetch("/api/study/semester-bootstrap/prior",{
        method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({priorId}),
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body?.error||"Could not detach historical source.");
      setConfirmed(false);router.refresh();
    }catch(caught){setError(caught instanceof Error?caught.message:"Could not detach prior.");}
    finally{setBusy(false);}
  }
  return <details className="semester-remove-prior-review">
    <summary>Review removal of historical link</summary>
    <p>This detaches the advisory link from the current course. It does not erase the archived semester or restore any mastery.</p>
    <label className="semester-review-confirm"><input type="checkbox" checked={confirmed} disabled={busy}
      onChange={event=>setConfirmed(event.target.checked)}/>
      <span>Detach this prior-course relationship.</span></label>
    <div className="button-row">
      <button className="secondary-button button-reset" type="button" disabled={!confirmed||busy}
        onClick={()=>void remove()}>{busy?"Detaching…":"Confirm detach"}</button>
    </div>
    {error?<p className="error" role="alert">{error}</p>:null}
  </details>;
}
