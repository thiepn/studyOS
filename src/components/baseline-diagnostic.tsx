"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BaselineClassification, BaselineSkill } from "@/lib/study/baseline";

const OPTIONS:{value:BaselineClassification;label:string;detail:string}[]=[
  {value:"retained",label:"Retained",detail:"I could retrieve and execute this independently."},
  {value:"rusty",label:"Rusty",detail:"I mostly knew it, but I was slow, uncertain, or incomplete."},
  {value:"weak",label:"Weak",detail:"I recognized the topic but could not execute it reliably."},
  {value:"never_mastered",label:"Never mastered",detail:"I never truly learned this skill well enough."},
];

export function BaselineDiagnosticPanel({courseId,courseName,skills,status}:{courseId:string;courseName:string;skills:BaselineSkill[];status:string}){
  const router=useRouter();const [busy,setBusy]=useState<string|null>(null);const [message,setMessage]=useState<string|null>(null);
  const [revealed,setRevealed]=useState<Set<string>>(new Set());
  const classified=skills.filter((skill)=>skill.result).length;
  const complete=skills.length>0&&classified===skills.length;

  async function action(payload:Record<string,unknown>,key:string){
    setBusy(key);setMessage(null);
    try{
      const response=await fetch("/api/study/baseline/"+courseId,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const body=await response.json();if(!response.ok)throw new Error(body?.error||"Baseline action failed");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Baseline action failed");}
    finally{setBusy(null);}
  }

  if(!skills.length)return <section className="panel baseline-empty">
    <p className="eyebrow">Retake baseline</p><h2>{courseName}</h2>
    <p>No active skills exist yet. Import/process your old course material first so StudyOS can diagnose the actual syllabus instead of inventing a generic one.</p>
    <div className="button-row"><Link className="primary-button" href="/resources">Import prior material</Link><Link className="secondary-button" href={"/courses/"+courseId}>Back to course</Link></div>
  </section>;

  return <section className="baseline-shell">
    <section className="panel baseline-head">
      <div><p className="eyebrow">Retake baseline</p><h1>{courseName}</h1><p>{classified}/{skills.length} skills classified · status {status.replace("_"," ")}</p></div>
      <div className="button-row">
        {status==="not_started"?<button className="primary-button button-reset" disabled={Boolean(busy)} onClick={()=>void action({action:"start"},"start")}>Start diagnostic</button>:null}
        <Link className="secondary-button" href={"/courses/"+courseId}>Back to course</Link>
      </div>
    </section>

    <section className="panel baseline-rules">
      <h2>How to use this</h2>
      <p>Attempt each prompt closed-book before revealing the rubric. Then classify the underlying skill. The classification controls reactivation timing only; it does <strong>not</strong> create mastery evidence.</p>
      <div className="baseline-legend">{OPTIONS.map((option)=><span key={option.value}><strong>{option.label}</strong>{option.detail}</span>)}</div>
    </section>

    <div className="baseline-list">{skills.map((skill,index)=>{
      const question=skill.question;const isRevealed=revealed.has(skill.id);const current=skill.result?.classification??null;
      return <article className="panel baseline-skill" key={skill.id}>
        <div className="baseline-skill-head"><div><p className="eyebrow">Skill {index+1}/{skills.length} · {skill.skill_kind.replace("_"," ")}</p><h2>{skill.title}</h2></div>{current?<span className={"baseline-state baseline-"+current}>{current.replace("_"," ")}</span>:<span className="status-pill">unclassified</span>}</div>
        {skill.description?<p className="muted">{skill.description}</p>:null}
        {question?<div className="baseline-question">
          <h3>Closed-book check</h3><p>{question.prompt}</p>
          {!isRevealed?<button className="secondary-button button-reset" onClick={()=>setRevealed((set)=>new Set([...set,skill.id]))}>Reveal rubric after attempting</button>:
            <div className="baseline-rubric"><strong>Rubric / answer</strong><p>{question.answer_key_or_rubric??"No rubric is stored for this question. Classify based on your actual attempt."}</p></div>}
        </div>:<p className="warning-text">No active question is mapped to this skill yet. You may classify it from prior knowledge, but adding a source-grounded question is preferable.</p>}
        <div className="baseline-options">{OPTIONS.map((option)=><button key={option.value} type="button" disabled={Boolean(busy)} className={current===option.value?"baseline-option selected":"baseline-option"} onClick={()=>void action({action:"classify",skillId:skill.id,classification:option.value,confidence:3},"classify:"+skill.id)}><strong>{option.label}</strong><span>{option.detail}</span></button>)}</div>
      </article>;
    })}</div>

    <section className="panel baseline-finish">
      <div><p className="eyebrow">Baseline completion</p><h2>{complete?"All skills classified":"Finish every skill first"}</h2><p>{complete?"Completing freezes the diagnostic summary and lets StudyOS treat this retake as ready for the semester.":"StudyOS will not infer missing topics as retained."}</p></div>
      <button className="primary-button button-reset" disabled={!complete||Boolean(busy)||status==="completed"} onClick={()=>void action({action:"complete"},"complete")}>{status==="completed"?"Baseline complete":"Complete baseline"}</button>
    </section>
    {message?<p className="form-message" role="status">{message}</p>:null}
  </section>;
}
