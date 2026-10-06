"use client";

import { useState } from "react";
import Link from "next/link";

type CarryCourse={courseId:string;displayName:string;shortName:string|null;credits:number|null;nextExamAt:string|null};

export function SemesterRolloverForm({
  sourceSemesterId,
  sourceSemesterName,
  defaultTimezone,
  eligible,
  blockers,
  carryCourses,
  staleCalendarBlocks,
}:{
  sourceSemesterId:string;
  sourceSemesterName:string;
  defaultTimezone:string;
  eligible:boolean;
  blockers:Array<{code:string;message:string;count:number}>;
  carryCourses:CarryCourse[];
  staleCalendarBlocks:number;
}){
  const [stableKey,setStableKey]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [startsOn,setStartsOn]=useState("");
  const [endsOn,setEndsOn]=useState("");
  const [timezone,setTimezone]=useState(defaultTimezone);
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<any|null>(null);
  const [message,setMessage]=useState<string|null>(null);

  async function submit(event:React.FormEvent){
    event.preventDefault();
    setBusy(true);setMessage(null);setResult(null);
    try{
      const response=await fetch("/api/study/semester-rollover",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({sourceSemesterId,stableKey,displayName,startsOn,endsOn:endsOn||null,timezone}),
      });
      const payload=await response.json();
      if(!response.ok)throw new Error(payload?.error||"Could not roll over semester");
      setResult(payload.data);
      setMessage("Semester rollover completed.");
    }catch(error){
      setMessage(error instanceof Error?error.message:"Could not roll over semester");
    }finally{setBusy(false);}
  }

  if(result){
    const warnings=Array.isArray(result.calendarErrors)?result.calendarErrors:[];
    return <div className="rollover-success">
      <h2>Rollover complete</h2>
      <p>{sourceSemesterName} is archived. {Number(result.rollover?.carried_course_count??0)} planned retake course{Number(result.rollover?.carried_course_count??0)===1?" was":"s were"} carried into the new semester.</p>
      <p>{Number(result.cancelledCalendarBlocks??0)} stale future StudyOS calendar block{Number(result.cancelledCalendarBlocks??0)===1?" was":"s were"} cancelled.</p>
      {warnings.length?<div className="rollover-warning"><strong>{warnings.length} calendar cleanup warning{warnings.length===1?"":"s"}.</strong> The academic rollover succeeded; retry cleanup from Semester History.</div>:null}
      <div className="button-row"><Link className="primary-button" href="/semester">Open new semester</Link><Link className="secondary-button" href="/semesters">Open semester history</Link></div>
      {message?<p className="form-message" role="status">{message}</p>:null}
    </div>;
  }

  return <form className="semester-rollover-form" onSubmit={submit}>
    {!eligible?<div className="rollover-blockers">
      <strong>Rollover is currently blocked.</strong>
      <ul>{blockers.map(item=><li key={item.code}>{item.message} <span>({item.count})</span></li>)}</ul>
    </div>:null}

    <div className="rollover-source">
      <strong>Archive: {sourceSemesterName}</strong>
      <span>{carryCourses.length} planned retake{carryCourses.length===1?"":"s"} will carry forward · {staleCalendarBlocks} stale future calendar block{staleCalendarBlocks===1?"":"s"} will be cleaned up</span>
    </div>

    <label><span>New semester key</span><input required pattern="[a-z0-9_]{2,40}" value={stableKey} onChange={e=>setStableKey(e.target.value)} placeholder="ss27"/></label>
    <label><span>Display name</span><input required maxLength={80} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="SS27"/></label>
    <label><span>Starts on</span><input required type="date" value={startsOn} onChange={e=>setStartsOn(e.target.value)}/></label>
    <label><span>Ends on (optional)</span><input type="date" value={endsOn} onChange={e=>setEndsOn(e.target.value)}/></label>
    <label className="rollover-wide"><span>Timezone</span><input required value={timezone} onChange={e=>setTimezone(e.target.value)}/></label>

    {carryCourses.length?<div className="rollover-wide carry-preview">
      <strong>Retakes that will carry forward</strong>
      {carryCourses.map(course=><div key={course.courseId}>
        <span>{course.shortName??course.displayName}</span>
        <small>{course.credits==null?"credits unknown":course.credits+" credits"}{course.nextExamAt?" · exam "+new Date(course.nextExamAt).toLocaleDateString():""}</small>
      </div>)}
    </div>:<div className="rollover-wide carry-preview"><strong>No courses will carry forward.</strong><small>The new semester will start with no courses until you add them.</small></div>}

    <label className="rollover-wide rollover-confirm">
      <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
      <span>I understand that the old semester becomes archived historical context and that weekly plans, study-time debt, calendar blocks, and ordinary course planning are not copied.</span>
    </label>

    <div className="rollover-wide button-row">
      <button className="primary-button button-reset" type="submit" disabled={!eligible||!confirmed||busy}>{busy?"Rolling over…":"Archive & create next semester"}</button>
    </div>
    {message?<p className="rollover-wide form-message" role="status">{message}</p>:null}
  </form>;
}
