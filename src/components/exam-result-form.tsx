"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CourseOption={
  courseId:string;
  displayName:string;
  shortName:string|null;
  examAt:string|null;
  resultReady:boolean;
  nextAttemptNo:number;
  latest:any|null;
  latestOfficial:any|null;
};

function datetimeLocalToIso(value:string){
  if(!value)return null;
  const d=new Date(value);
  return Number.isNaN(d.getTime())?null:d.toISOString();
}

export function ExamResultForm({courses}:{courses:CourseOption[]}){
  const router=useRouter();
  const [courseId,setCourseId]=useState(courses[0]?.courseId??"");
  const selected=useMemo(()=>courses.find(c=>c.courseId===courseId)??courses[0]??null,[courses,courseId]);
  const editable=selected?.latestOfficial?.retake_decision==="pending"?selected.latestOfficial:selected?.latest?.result_status==="provisional"?selected.latest:null;
  const [resultStatus,setResultStatus]=useState<"provisional"|"official">((editable?.result_status??"official") as any);
  const [outcome,setOutcome]=useState<"passed"|"failed"|"absent"|"withdrawn">((editable?.outcome??"passed") as any);
  const [gradeText,setGradeText]=useState(editable?.grade_text??"");
  const [scorePercent,setScorePercent]=useState(editable?.score_percent==null?"":String(editable.score_percent));
  const [retakeDecision,setRetakeDecision]=useState<"not_applicable"|"pending"|"planned"|"declined">((editable?.retake_decision??"not_applicable") as any);
  const [nextExamAt,setNextExamAt]=useState("");
  const [sourceUrl,setSourceUrl]=useState(editable?.source_url??"");
  const [sourceNote,setSourceNote]=useState(editable?.source_note??"");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);

  function resetForCourse(id:string){
    const c=courses.find(row=>row.courseId===id)??null;
    const row=c?.latestOfficial?.retake_decision==="pending"?c.latestOfficial:c?.latest?.result_status==="provisional"?c.latest:null;
    setCourseId(id);
    setResultStatus((row?.result_status??"official") as any);
    setOutcome((row?.outcome??"passed") as any);
    setGradeText(row?.grade_text??"");
    setScorePercent(row?.score_percent==null?"":String(row.score_percent));
    setRetakeDecision((row?.retake_decision??"not_applicable") as any);
    setNextExamAt("");
    setSourceUrl(row?.source_url??"");
    setSourceNote(row?.source_note??"");
    setMessage(null);
  }

  function changeOutcome(value:"passed"|"failed"|"absent"|"withdrawn"){
    setOutcome(value);
    if(value==="passed"){setRetakeDecision("not_applicable");setNextExamAt("");}
    else if(retakeDecision==="not_applicable")setRetakeDecision("pending");
  }

  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(!selected)return;
    setBusy(true);setMessage(null);
    try{
      const response=await fetch("/api/study/exam-results/record",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({
          courseId:selected.courseId,
          attemptNo:editable?.attempt_no??selected.nextAttemptNo,
          resultStatus,outcome,gradeText,
          scorePercent:scorePercent===""?null:Number(scorePercent),
          retakeDecision,
          nextExamAt:retakeDecision==="planned"?datetimeLocalToIso(nextExamAt):null,
          sourceUrl,sourceNote,
        }),
      });
      const payload=await response.json();
      if(!response.ok)throw new Error(payload?.error||"Could not record exam result");
      const reconcile=payload?.data?.reconciliation?.summary??"Result recorded.";
      const cleanup=payload?.data?.cleanupWarning?" Planning cleanup warning: "+payload.data.cleanupWarning:"";
      setMessage(reconcile+cleanup);
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Could not record exam result");
    }finally{setBusy(false);}
  }

  if(!courses.length)return <p className="muted">No completed exam is currently ready for result intake.</p>;

  return <form className="exam-result-form" onSubmit={submit}>
    <label><span>Course</span><select value={courseId} onChange={e=>resetForCourse(e.target.value)}>
      {courses.map(course=><option value={course.courseId} key={course.courseId}>{course.shortName??course.displayName}</option>)}
    </select></label>
    <label><span>Attempt</span><input readOnly value={editable?.attempt_no??selected?.nextAttemptNo??1}/></label>
    <label><span>Result status</span><select value={resultStatus} onChange={e=>setResultStatus(e.target.value as any)}>
      <option value="official">Official</option><option value="provisional">Provisional</option>
    </select></label>
    <label><span>Outcome</span><select value={outcome} onChange={e=>changeOutcome(e.target.value as any)}>
      <option value="passed">Passed</option><option value="failed">Failed</option><option value="absent">Absent</option><option value="withdrawn">Withdrawn</option>
    </select></label>
    <label><span>Grade / mark</span><input maxLength={40} value={gradeText} onChange={e=>setGradeText(e.target.value)} placeholder="e.g. 1.7, bestanden"/></label>
    <label><span>Score % (optional)</span><input type="number" min="0" max="100" step="0.01" value={scorePercent} onChange={e=>setScorePercent(e.target.value)}/></label>

    {outcome!=="passed"?<label><span>Retake decision</span><select value={retakeDecision} onChange={e=>setRetakeDecision(e.target.value as any)}>
      <option value="pending">Decision pending</option><option value="planned">Retake planned</option><option value="declined">No retake</option>
    </select></label>:null}

    {outcome!=="passed"&&retakeDecision==="planned"?<label><span>Next exam</span><input required type="datetime-local" value={nextExamAt} onChange={e=>setNextExamAt(e.target.value)}/></label>:null}
    <label className="exam-result-wide"><span>Official source URL (optional)</span><input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://…"/></label>
    <label className="exam-result-wide"><span>Note (optional)</span><textarea maxLength={2000} value={sourceNote} onChange={e=>setSourceNote(e.target.value)} rows={3}/></label>

    <div className="exam-result-wide exam-result-warning">
      {resultStatus==="official"&&outcome==="passed"
        ?"Official pass: StudyOS will close this course and remove it from active planning."
        :resultStatus==="official"&&retakeDecision==="planned"
          ?"Official non-pass + planned retake: the course becomes a retake and the new exam date becomes authoritative."
          :resultStatus==="official"&&retakeDecision==="pending"
            ?"Official non-pass + pending decision: discretionary study pauses until the retake decision is resolved."
            :resultStatus==="official"&&retakeDecision==="declined"
              ?"Official non-pass + no retake: the course closes without a pass."
              :"Provisional results are recorded for reference only and do not change course state."}
    </div>

    <div className="exam-result-wide button-row"><button className="primary-button button-reset" disabled={busy} type="submit">{busy?"Saving…":editable?"Update result":"Record result"}</button></div>
    {message?<p className="exam-result-wide form-message" role="status">{message}</p>:null}
  </form>;
}
