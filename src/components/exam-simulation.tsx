"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudyErrorType } from "@/lib/supabase/database.types";
import type { ExamSimulationPage, SimulationQuestion } from "@/lib/study/exams";

const ERRORS:{value:StudyErrorType;label:string}[]=[
  {value:"concept",label:"Concept"},{value:"recall",label:"Recall"},{value:"recognition",label:"Recognition"},
  {value:"method_selection",label:"Method choice"},{value:"execution",label:"Execution"},{value:"proof_structure",label:"Proof"},
  {value:"calculation",label:"Calculation"},{value:"misreading",label:"Misread"},{value:"time_management",label:"Time"},
  {value:"programming_bug",label:"Programming bug"},
];

function secondsLabel(seconds:number){
  const s=Math.max(0,Math.floor(seconds)); const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sec=s%60;
  return h?(h+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0")):(m+":"+String(sec).padStart(2,"0"));
}
async function post(payload:Record<string,unknown>){
  const response=await fetch("/api/study/exams/simulation",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  const body=await response.json(); if(!response.ok) throw new Error(body?.error||"Exam action failed"); return body.data;
}

export function ExamSimulation({data}:{data:ExamSimulationPage}){
  const router=useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState<string|null>(null);
  const [questions,setQuestions]=useState<SimulationQuestion[]>(data.questions);
  const [index,setIndex]=useState(0); const [now,setNow]=useState(Date.now()); const [activeSince,setActiveSince]=useState(Date.now());
  const autoSubmitted=useRef(false);
  const sim=data.simulation; const status=sim?.status??null;
  const current=questions[index]??null;
  const deadline=sim?Date.parse(sim.started_at)+sim.duration_minutes*60_000:null;
  const remaining=deadline?Math.max(0,Math.ceil((deadline-now)/1000)):0;

  useEffect(()=>{
    if(status!=="in_progress") return;
    const t=window.setInterval(()=>setNow(Date.now()),1000); return()=>window.clearInterval(t);
  },[status]);

  const totalAnswered=useMemo(()=>questions.filter((q)=>q.response_text?.trim()).length,[questions]);
  const allGraded=questions.length>0&&questions.every((q)=>q.awarded_points!=null);

  function accrued(q:SimulationQuestion){
    if(q.exam_question_id!==current?.exam_question_id) return q.duration_seconds;
    return q.duration_seconds+Math.max(0,Math.floor((Date.now()-activeSince)/1000));
  }
  async function persistCurrent(){
    if(!sim||!current||status!=="in_progress") return;
    const duration=accrued(current);
    await post({action:"save",simulationId:sim.id,examQuestionId:current.exam_question_id,responseText:current.response_text??"",durationSeconds:duration});
    setQuestions((list)=>list.map((q)=>q.exam_question_id===current.exam_question_id?{...q,duration_seconds:duration}:q));
    setActiveSince(Date.now());
  }
  async function go(next:number){
    setBusy(true);setMessage(null);
    try{await persistCurrent();setIndex(Math.max(0,Math.min(questions.length-1,next)));setActiveSince(Date.now());}
    catch(error){setMessage(error instanceof Error?error.message:"Could not save response");}finally{setBusy(false);}
  }
  async function start(){
    setBusy(true);setMessage(null);
    try{await post({action:"start",examId:data.paper.exam_id,sessionId:crypto.randomUUID(),startedAt:new Date().toISOString()});router.refresh();}
    catch(error){setMessage(error instanceof Error?error.message:"Could not start timed paper");}finally{setBusy(false);}
  }
  async function submit(){
    if(!sim||status!=="in_progress") return;
    setBusy(true);setMessage(null);
    try{
      const elapsedCurrent=current?Math.max(0,Math.floor((Date.now()-activeSince)/1000)):0;
      const responses=questions.map((q)=>({examQuestionId:q.exam_question_id,responseText:q.response_text??"",durationSeconds:q.duration_seconds+(q.exam_question_id===current?.exam_question_id?elapsedCurrent:0)}));
      await post({action:"submit",simulationId:sim.id,responses,submittedAt:new Date().toISOString()});router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not submit timed paper");}finally{setBusy(false);}
  }
  useEffect(()=>{
    if(status==="in_progress"&&deadline&&remaining===0&&!autoSubmitted.current){autoSubmitted.current=true;void submit();}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[status,deadline,remaining]);

  async function grade(question:SimulationQuestion,points:number,errors:StudyErrorType[],confidence:number){
    if(!sim) return;
    setBusy(true);setMessage(null);
    try{
      const result=await post({action:"grade",simulationId:sim.id,examQuestionId:question.exam_question_id,awardedPoints:points,errorTypes:errors,selfConfidence:confidence});
      setQuestions((list)=>list.map((q)=>q.exam_question_id===question.exam_question_id?{...q,awarded_points:points,error_types:errors,self_confidence:confidence,grading_status:result.grading_status,graded_at:new Date().toISOString()}:q));
      setMessage(result.mastery_credited?"Graded against a verified/official rubric; exam evidence credited.":"Provisional grade saved; no mastery credit until its rubric is verified.");
      const next=questions.findIndex((q,i)=>i>index&&q.awarded_points==null); if(next>=0)setIndex(next);
    }catch(error){setMessage(error instanceof Error?error.message:"Could not grade question");}finally{setBusy(false);}
  }
  async function finish(){
    if(!sim) return;setBusy(true);setMessage(null);
    try{await post({action:"finish",simulationId:sim.id});router.refresh();}
    catch(error){setMessage(error instanceof Error?error.message:"Could not finish grading");}finally{setBusy(false);}
  }
  async function abandon(){
    if(!sim) return;setBusy(true);setMessage(null);
    try{await post({action:"abandon",simulationId:sim.id});router.refresh();}
    catch(error){setMessage(error instanceof Error?error.message:"Could not abandon paper");}finally{setBusy(false);}
  }

  if(!sim) return <section className="panel exam-sim-start">
    <p className="eyebrow">{data.paper.course_short_name??data.paper.course_name} · timed Altklausur</p><h2>{data.paper.title}</h2>
    <div className="exam-sim-facts"><span><strong>{data.paper.duration_minutes??"?"}</strong> minutes</span><span><strong>{data.paper.total_points??data.paper.question_points}</strong> points</span><span><strong>{data.paper.question_count}</strong> questions</span></div>
    <p>Closed-book simulation. Solutions stay hidden until the paper is submitted. A score based on an unverified rubric remains provisional and cannot create mastery evidence.</p>
    <div className="button-row"><button className="primary-button button-reset" disabled={busy||!data.paper.simulatable} onClick={()=>void start()}>Start timed paper</button>{data.paper.source_url?<a className="secondary-button" href={data.paper.source_url} target="_blank" rel="noreferrer">Open original PDF</a>:null}<Link className="secondary-button" href={"/courses/"+data.paper.course_id}>Back to course</Link></div>
    {message?<p className="form-message">{message}</p>:null}
  </section>;

  if(status==="completed"||status==="abandoned") return <section className="panel exam-sim-start">
    <p className="eyebrow">{data.paper.course_short_name??data.paper.course_name} · timed Altklausur</p><h2>{data.paper.title}</h2>
    <div className="exam-sim-facts"><span><strong>{data.paper.duration_minutes??"?"}</strong> minutes</span><span><strong>{data.paper.total_points??data.paper.question_points}</strong> points</span><span><strong>{data.paper.question_count}</strong> questions</span></div>
    {status==="completed"?<div className="exam-result-summary">
      <div><strong>{Math.round(Number(sim.score_percent??0))}%</strong><span>raw score</span></div>
      <div><strong>{sim.verified_score_percent==null?"—":Math.round(Number(sim.verified_score_percent))+"%"}</strong><span>verified score</span></div>
      <div><strong>{Math.round(Number(sim.verified_coverage_percent??0))}%</strong><span>verified grading</span></div>
      <div><strong>{secondsLabel(Number(sim.time_used_seconds??0))}</strong><span>time used</span></div>
    </div>:null}
    <p>Closed-book simulation. Solutions stay hidden until the paper is submitted. A score based on an unverified rubric remains provisional and cannot create mastery evidence.</p>
    <div className="button-row"><button className="primary-button button-reset" disabled={busy||!data.paper.simulatable} onClick={()=>void start()}>{status==="completed"?"Run another timed paper":"Start timed paper"}</button>{data.paper.source_url?<a className="secondary-button" href={data.paper.source_url} target="_blank" rel="noreferrer">Open original PDF</a>:null}<Link className="secondary-button" href={"/courses/"+data.paper.course_id}>Back to course</Link></div>
    {message?<p className="form-message">{message}</p>:null}
  </section>;

  if(status==="in_progress"&&current) return <section className="exam-sim-shell">
    <div className="panel exam-sim-toolbar"><div><p className="eyebrow">Timed paper</p><h2>{data.paper.title}</h2><span>{totalAnswered}/{questions.length} answered</span></div><div className={remaining<=300?"exam-clock exam-clock-low":"exam-clock"} role="timer" aria-live="off" aria-label={"Remaining examination time: "+secondsLabel(remaining)}>{secondsLabel(remaining)}</div></div>
    <nav className="exam-question-nav" aria-label="Timed paper questions">{questions.map((q,i)=><button key={q.exam_question_id} type="button" className={i===index?"active":q.response_text?.trim()?"answered":""}
      aria-current={i===index?"step":undefined}
      aria-label={"Question "+q.question_no+(q.response_text?.trim()?", answer entered":", not yet answered")}
      onClick={()=>void go(i)} disabled={busy}>{q.question_no}</button>)}</nav>
    <article className="panel exam-question">
      <div className="exam-question-head"><div><p className="eyebrow">Question {current.question_no}</p><h2>{current.max_points} points</h2></div><span>{secondsLabel(accrued(current))} on question</span></div>
      <p className="exam-prompt">{current.prompt_text}</p>
      <textarea rows={12} value={current.response_text??""} onChange={(e)=>setQuestions((list)=>list.map((q)=>q.exam_question_id===current.exam_question_id?{...q,response_text:e.target.value}:q))} placeholder="Work here, or write a concise record of what you solved on paper."/>
      <div className="button-row"><button className="secondary-button button-reset" disabled={busy||index===0} onClick={()=>void go(index-1)}>Previous</button>{index<questions.length-1?<button className="primary-button button-reset" disabled={busy} onClick={()=>void go(index+1)}>Save & next</button>:null}<button className="danger-button button-reset" disabled={busy} onClick={()=>void submit()}>Submit paper</button></div>
      {message?<p className="form-message">{message}</p>:null}
    </article>
  </section>;

  if(status==="grading"&&current) return <section className="exam-sim-shell">
    <div className="panel exam-sim-toolbar"><div><p className="eyebrow">Post-exam grading</p><h2>{data.paper.title}</h2><span>{questions.filter((q)=>q.awarded_points!=null).length}/{questions.length} graded</span></div></div>
    <nav className="exam-question-nav" aria-label="Grading navigation">{questions.map((q,i)=><button key={q.exam_question_id} type="button" className={i===index?"active":q.awarded_points!=null?"answered":""}
      aria-current={i===index?"step":undefined}
      aria-label={"Question "+q.question_no+(q.awarded_points!=null?", grade recorded":", awaiting grade")}
      onClick={()=>setIndex(i)}>{q.question_no}</button>)}</nav>
    <ExamGradeCard question={current} busy={busy} onGrade={grade}/>
    <div className="button-row">{allGraded?<button className="primary-button button-reset" disabled={busy} onClick={()=>void finish()}>Finish grading</button>:null}<button className="secondary-button button-reset" disabled={busy} onClick={()=>void abandon()}>Abandon simulation</button></div>
    {message?<p className="form-message">{message}</p>:null}
  </section>;
  return null;
}

function ExamGradeCard({question,busy,onGrade}:{question:SimulationQuestion;busy:boolean;onGrade:(q:SimulationQuestion,p:number,e:StudyErrorType[],c:number)=>Promise<void>}){
  const [points,setPoints]=useState(question.awarded_points??question.max_points); const [errors,setErrors]=useState<StudyErrorType[]>(question.error_types??[]);
  const [confidence,setConfidence]=useState(question.self_confidence??3);
  const lost=points<question.max_points;
  function toggle(value:StudyErrorType){setErrors((list)=>list.includes(value)?list.filter((x)=>x!==value):[...list,value]);}
  return <article className="panel exam-grade-card">
    <div className="exam-question-head"><div><p className="eyebrow">Question {question.question_no}</p><h2>{question.max_points} points</h2></div><span className={"status-pill answer-"+question.answer_status}>{question.answer_status} rubric</span></div>
    <h3>Prompt</h3><p className="exam-prompt">{question.prompt_text}</p>
    <h3>Your response</h3><pre className="exam-response">{question.response_text?.trim()||"(No written response recorded.)"}</pre>
    <h3>Rubric / solution</h3>{question.answer_key_or_rubric?<div className="exam-rubric">{question.answer_key_or_rubric}</div>:<p className="warning-text">No grading rubric is available. This question can only receive a provisional self-score.</p>}
    <div className="exam-grade-controls">
      <label><span>Points</span><input type="number" min="0" max={question.max_points} step="0.5" value={points} onChange={(e)=>setPoints(Number(e.target.value))}/><small>/ {question.max_points}</small></label>
      <label><span>Confidence</span><select value={confidence} onChange={(e)=>setConfidence(Number(e.target.value))}>{[1,2,3,4,5].map((x)=><option key={x} value={x}>{x}/5</option>)}</select></label>
    </div>
    {lost?<><p className="eyebrow">Why were points lost?</p><div className="error-chip-grid">{ERRORS.map((option)=><label key={option.value} className={errors.includes(option.value)?"error-chip selected":"error-chip"}><input type="checkbox" checked={errors.includes(option.value)} onChange={()=>toggle(option.value)}/>{option.label}</label>)}</div></>:null}
    <button className="primary-button button-reset" type="button" disabled={busy||points<0||points>question.max_points||(lost&&!errors.length)} onClick={()=>void onGrade(question,points,lost?errors:[],confidence)}>{question.awarded_points==null?"Save grade":"Update grade"}</button>
  </article>;
}
