"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StudyAttemptResult, StudyErrorType, StudyIndependence } from "@/lib/supabase/database.types";
import type { QueueItem } from "@/lib/study/types";
import { assessmentReady, assessmentSourceVerified, canRevealRubric, escalateIndependence, isMasteryCreditable, resultLabel } from "@/lib/study/review-state";
import { submitAttemptWithFallback } from "@/lib/study/offline-attempts";
import { finishSessionWithFallback, startSessionWithFallback } from "@/lib/study/offline-sessions";
import { composeProblemWork } from "@/lib/study/problem-work";
import { MathContent } from "@/components/math-content";
import { PracticeFocusGuide } from "@/components/practice-focus-guide";
import { outlineProof } from "@/lib/study/proof-outline";
import { parseStudyDraft, studyDraftStorageKey, studyQueueFingerprint, type StudyDraft } from "@/lib/study/study-draft";

const ERROR_OPTIONS: { value: StudyErrorType; label: string }[] = [
  { value: "concept", label: "Concept" }, { value: "recall", label: "Recall" },
  { value: "recognition", label: "Recognition" }, { value: "method_selection", label: "Method choice" },
  { value: "execution", label: "Execution" }, { value: "proof_structure", label: "Proof structure" },
  { value: "calculation", label: "Calculation" }, { value: "misreading", label: "Misread" },
  { value: "time_management", label: "Time" }, { value: "programming_bug", label: "Programming bug" },
];

type Phase = "ready" | "starting" | "answering" | "grading" | "submitting" | "complete";
type Outcome = { questionId: string; result?: StudyAttemptResult; independence?: StudyIndependence; queued?: boolean; durationSeconds?: number; skipped?: boolean };

function formatSeconds(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export function ReviewSession({ queue, plannedMinutes, sessionType = "review", courseId, eyebrow = "Daily retrieval", intro, completionNote, returnHref = "/", returnLabel = "Back to Today" }: { queue: QueueItem[]; plannedMinutes: number; sessionType?: "review"|"checkpoint"|"exam_simulation"|"relearning"|"coursework"; courseId?: string; eyebrow?: string; intro?: string; completionNote?: string; returnHref?: string; returnLabel?: string }) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [focusMode, setFocusMode] = useState(true);
  const [answerSurface, setAnswerSurface] = useState<"typed"|"paper">("typed");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [requestId,setRequestId]=useState("");
  const [draftHydrated,setDraftHydrated]=useState(false);
  const [draftNotice,setDraftNotice]=useState<string|null>(null);
  const [draftStatus,setDraftStatus]=useState<"saved"|"unavailable"|null>(null);
  const [lockedDuration, setLockedDuration] = useState(0);
  const [responseText, setResponseText] = useState("");
  const [workingText,setWorkingText]=useState("");
  const workingRef=useRef<HTMLTextAreaElement>(null);
  const composedResponse=composeProblemWork(workingText,responseText);
  const proofOutline=useMemo(()=>outlineProof(workingText),[workingText]);
  const [independence, setIndependence] = useState<StudyIndependence>("independent");
  const [hint1Visible, setHint1Visible] = useState(false);
  const [hint2Visible, setHint2Visible] = useState(false);
  const [result, setResult] = useState<StudyAttemptResult | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [verifiedExternally, setVerifiedExternally] = useState(false);
  const [errorTypes, setErrorTypes] = useState<StudyErrorType[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = queue[index] ?? null;
  const draftFingerprint=useMemo(
    ()=>studyQueueFingerprint(
      sessionType,courseId,
      queue.map(x=>({id:x.question.id,prompt:x.question.prompt,answer_key_or_rubric:x.question.answer_key_or_rubric})),
      [returnHref,completionNote??""].join("|"),
    ),
    [sessionType,courseId,queue,returnHref,completionNote],
  );
  const draftKey=studyDraftStorageKey(draftFingerprint);
  const questionIds=useMemo(()=>queue.map(item=>item.question.id),[queue]);

  // Recover only the same queue in this browser tab. A local draft does not
  // substitute for a server-saved attempt, nor is it accessible cross-device.
  useEffect(()=>{
    try{
      const raw=window.sessionStorage.getItem(draftKey);
      const restored=parseStudyDraft(raw,draftFingerprint,questionIds);
      if(restored){
        setSessionId(restored.sessionId);setSessionStartedAt(restored.sessionStartedAt);
        setQuestionStartedAt(restored.questionStartedAt);setIndex(restored.index);
        setPhase(restored.phase);setRequestId(restored.requestId);
        setAnswerSurface(restored.answerSurface);setWorkingText(restored.workingText);
        setResponseText(restored.responseText);setConfidence(restored.confidence);
        setIndependence(restored.independence);setHint1Visible(restored.hint1Visible);
        setHint2Visible(restored.hint2Visible);setResult(restored.result);
        setVerifiedExternally(restored.verifiedExternally);setErrorTypes(restored.errorTypes);
        setLockedDuration(restored.lockedDuration);setElapsed(restored.activeSeconds);
        setOutcomes(restored.outcomes);
        setDraftNotice(restored.phase==="answering"
          ?"Unfinished work restored from this browser tab. Continue solving before revealing the answer."
          :"Locked answer restored. The rubric has already been revealed; finish grading this attempt.");
      }else if(raw){
        window.sessionStorage.removeItem(draftKey);
      }
    }catch{setDraftStatus("unavailable");}
    setDraftHydrated(true);
  },[draftKey,draftFingerprint,questionIds]);

  // Count visible activity only. Background tabs, sleep and page reloads must
  // not inflate the time used to assess independent problem solving.
  useEffect(()=>{
    if(phase!=="answering"||!questionStartedAt)return;
    let last=performance.now();
    let remainder=0;
    const tick=()=>{
      const now=performance.now();
      const delta=Math.max(0,Math.min(now-last,5000));
      last=now;
      if(document.visibilityState!=="visible"){remainder=0;return;}
      remainder+=delta;
      const whole=Math.floor(remainder/1000);
      if(whole){remainder-=whole*1000;setElapsed(value=>Math.min(43200,value+whole));}
    };
    const timer=window.setInterval(tick,1000);
    const visibility=()=>{last=performance.now();remainder=0;};
    document.addEventListener("visibilitychange",visibility);
    return ()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",visibility);};
  },[phase,questionStartedAt]);

  const draftSnapshot=useMemo<StudyDraft|null>(()=>{
    if(!draftHydrated || !sessionId || !sessionStartedAt || !questionStartedAt
      || !current || !requestId || !["answering","grading","submitting"].includes(phase))return null;
    return {
      version:1,fingerprint:draftFingerprint,savedAt:new Date().toISOString(),
      sessionId,sessionStartedAt,questionStartedAt,questionId:current.question.id,index,
      phase:phase as StudyDraft["phase"],requestId,answerSurface,
      workingText,responseText,confidence,independence,hint1Visible,hint2Visible,
      result,verifiedExternally,errorTypes,lockedDuration,activeSeconds:elapsed,outcomes,
    };
  },[draftHydrated,draftFingerprint,sessionId,sessionStartedAt,questionStartedAt,
    current,index,phase,requestId,answerSurface,workingText,responseText,confidence,
    independence,hint1Visible,hint2Visible,result,verifiedExternally,errorTypes,lockedDuration,elapsed,outcomes]);
  const draftRef=useRef<StudyDraft|null>(null);
  useEffect(()=>{draftRef.current=draftSnapshot;},[draftSnapshot]);
  useEffect(()=>{
    if(!draftHydrated)return;
    if(phase==="complete"){
      try{window.sessionStorage.removeItem(draftKey);}catch{}
      return;
    }
    if(!draftSnapshot)return;
    const timer=window.setTimeout(()=>{
      try{window.sessionStorage.setItem(draftKey,JSON.stringify(draftSnapshot));setDraftStatus("saved");}
      catch{setDraftStatus("unavailable");}
    },350);
    return ()=>window.clearTimeout(timer);
  },[draftHydrated,draftKey,phase,draftSnapshot]);
  useEffect(()=>{
    if(!draftHydrated)return;
    const flush=()=>{
      if(!draftRef.current)return;
      try{window.sessionStorage.setItem(draftKey,JSON.stringify(draftRef.current));}
      catch{setDraftStatus("unavailable");}
    };
    window.addEventListener("pagehide",flush);
    return ()=>window.removeEventListener("pagehide",flush);
  },[draftHydrated,draftKey]);

  const summary = useMemo(() => {
    const attempted = outcomes.filter((x) => !x.skipped);
    return {
      attempted: attempted.length,
      correct: attempted.filter((x) => x.result === "correct").length,
      partial: attempted.filter((x) => x.result === "partial").length,
      incorrect: attempted.filter((x) => x.result === "incorrect").length,
      queued: attempted.filter((x) => x.queued).length,
      skipped: outcomes.filter((x) => x.skipped).length,
      seconds: attempted.reduce((sum, x) => sum + (x.durationSeconds ?? 0), 0),
    };
  }, [outcomes]);

  function resetQuestion(nextIndex: number) {
    setIndex(nextIndex); setQuestionStartedAt(new Date().toISOString()); setElapsed(0); setLockedDuration(0);
    setRequestId(crypto.randomUUID());setDraftNotice(null);
    setResponseText(""); setWorkingText(""); setAnswerSurface("typed"); setIndependence("independent"); setHint1Visible(false); setHint2Visible(false);
    setResult(null); setConfidence(null); setVerifiedExternally(false); setErrorTypes([]); setNotice(null); setError(null); setPhase("answering");
  }

  async function start() {
    if (!queue.length) return;
    const id = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    setError(null); setPhase("starting"); setSessionId(id); setSessionStartedAt(startedAt);
    try {
      const sync = await startSessionWithFallback({ sessionId: id, plannedMinutes: Math.max(1, plannedMinutes), startedAt, sessionType, courseId });
      resetQuestion(0);
      if (sync.queued) setNotice("Session start is saved locally and will sync when the connection returns.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the session.");
      setPhase("ready");
    }
  }

  function revealForGrading(gaveUp = false) {
    if (!canRevealRubric(confidence, answerSurface, composedResponse, gaveUp)) return;
    const duration = Math.max(1,Math.min(43200,elapsed));
    setLockedDuration(duration);
    if (gaveUp) {
      setIndependence((x) => escalateIndependence(x, "solution_exposed"));
      setResult("incorrect");
    }
    setPhase("grading");
  }

  function insertMathSymbol(symbol:string){
    const input=workingRef.current;
    const start=input?.selectionStart??workingText.length;
    const end=input?.selectionEnd??workingText.length;
    setWorkingText(current=>current.slice(0,start)+symbol+current.slice(end));
    window.requestAnimationFrame(()=>{
      workingRef.current?.focus();
      workingRef.current?.setSelectionRange(start+symbol.length,start+symbol.length);
    });
  }

  function jumpToProof(offset:number){
    const textarea=workingRef.current;
    if(!textarea)return;
    textarea.focus();
    textarea.setSelectionRange(offset,offset);
  }

  function showHint(level: 1 | 2) {
    if (level === 1) { setHint1Visible(true); setIndependence((x) => escalateIndependence(x, "hint_1")); }
    else { setHint1Visible(true); setHint2Visible(true); setIndependence((x) => escalateIndependence(x, "hint_2")); }
  }

  function toggleError(value: StudyErrorType) {
    setErrorTypes((currentErrors) => currentErrors.includes(value) ? currentErrors.filter((x) => x !== value) : [...currentErrors, value]);
  }

  async function finishSession(extraOutcomes: Outcome[] = outcomes) {
    const endedAt = new Date().toISOString();
    if (sessionId) {
      const pending = extraOutcomes.filter((x) => x.queued).length;
      const note=[completionNote,pending ? `${pending} attempt(s) were pending local sync when the session ended.` : null].filter(Boolean).join(" · ") || undefined;
      await finishSessionWithFallback({ sessionId, endedAt, note });
    }
    draftRef.current=null;
    try{window.sessionStorage.removeItem(draftKey);}catch{}
    setPhase("complete");
  }

  async function submitAssessment() {
    if (!current || !result || !assessmentReady(result, confidence, errorTypes)
      || !assessmentSourceVerified(Boolean(current.question.answer_key_or_rubric?.trim()), verifiedExternally, independence)) return;
    setPhase("submitting"); setError(null);
    const completedAt = new Date().toISOString();
    try {
      const submitted = await submitAttemptWithFallback({
        clientRequestId: requestId || crypto.randomUUID(), questionId: current.question.id, sessionId: sessionId ?? undefined,
        startedAt: questionStartedAt ?? undefined, result, independence, durationSeconds: Math.max(1, lockedDuration),
        responseText: composedResponse.trim().slice(0,20000) || undefined, selfConfidence: confidence ?? undefined, errorTypes, completedAt,
      });
      const nextOutcomes = [...outcomes, { questionId: current.question.id, result, independence, queued: submitted.queued, durationSeconds: Math.max(1, lockedDuration) }];
      setOutcomes(nextOutcomes);
      if (index + 1 >= queue.length) await finishSession(nextOutcomes); else resetQuestion(index + 1);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save this attempt."); setPhase("grading"); }
  }

  async function skip() {
    if (!current || phase !== "answering") return;
    const nextOutcomes = [...outcomes, { questionId: current.question.id, skipped: true }];
    setOutcomes(nextOutcomes);
    if (index + 1 >= queue.length) await finishSession(nextOutcomes); else resetQuestion(index + 1);
  }

  if (!queue.length) return <section className="panel empty-state"><h2>No questions in this set</h2><p>There are no questions available for this session. That can mean nothing is due, the course has no approved questions, or the current time budget cannot fit a question.</p><div className="button-row"><Link className="secondary-button" href="/courses">View courses</Link><Link className="secondary-button" href="/resources">Check materials</Link></div></section>;

  if (!draftHydrated) return <section className="panel review-start"><p className="muted">Checking this tab for unfinished work…</p></section>;

  if (phase === "ready" || phase === "starting") return (
    <section className="panel review-start" aria-labelledby="practice-start-heading" aria-busy={phase==="starting"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id="practice-start-heading">{queue.length} questions · {plannedMinutes} planned minutes</h2>
      <p>{intro ?? "Work from memory first. Hints lower evidentiary strength. If you give up and reveal the solution before locking an answer, the attempt receives no mastery credit and becomes a repair item."}</p>
      <ol className="practice-start-rules" aria-label="Independent work sequence">
        <li>Attempt from memory, on paper or in the working editor.</li>
        <li>Choose confidence and lock the answer before comparing it with a source.</li>
        <li>Diagnose the attempt and save or queue it under your signed-in account.</li>
      </ol>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button className="primary-button button-reset" type="button" disabled={phase === "starting"} onClick={() => void start()}>{phase === "starting" ? "Starting…" : "Start review"}</button>
    </section>
  );

  if (phase === "complete") return (
    <section className="panel review-complete">
      <p className="eyebrow">{sessionType === "checkpoint" ? "Checkpoint complete" : "Session complete"}</p><h2>{summary.attempted} attempts completed</h2>
      <div className="summary-grid"><div><strong>{summary.correct}</strong><span>correct</span></div><div><strong>{summary.partial}</strong><span>partial</span></div><div><strong>{summary.incorrect}</strong><span>incorrect</span></div><div><strong>{summary.skipped}</strong><span>skipped</span></div></div>
      <p>{formatSeconds(summary.seconds)} active solving time{summary.queued ? ` · ${summary.queued} attempt(s) waiting for sync` : ""}.</p>
      <ol className="practice-outcome-ledger" aria-label="Question-by-question evidence">
        {outcomes.map((item,i)=><li key={item.questionId}>
          <span className="practice-outcome-index">Q{String(i+1).padStart(2,"0")}</span>
          <strong>{item.skipped?"Skipped · no attempt":item.result?resultLabel(item.result):"Not graded"}</strong>
          <span>{item.skipped?"No outcome saved":item.queued?"Queued for signed-in account sync":"Recorded"}
            {item.independence==="solution_exposed"?" · solution exposed, no mastery credit":item.independence&&item.independence!=="independent"?" · "+item.independence.replaceAll("_"," ")+" used":""}</span>
        </li>)}
      </ol>
      <div className="button-row"><Link className="primary-button" href={returnHref}>{returnLabel}</Link><Link className="secondary-button" href="/progress">View progress</Link></div>
    </section>
  );

  if (!current) return null;
  const expected = Math.ceil(Number(current.question.expected_minutes));
  const creditable = isMasteryCreditable(independence);
  const hasRubric = Boolean(current.question.answer_key_or_rubric?.trim());
  const canSubmit = assessmentReady(result, confidence, errorTypes)
    && assessmentSourceVerified(hasRubric, verifiedExternally, independence) && phase !== "submitting";
  const canLock = canRevealRubric(confidence, answerSurface, composedResponse);
  const canGiveUp = canRevealRubric(confidence, answerSurface, responseText, true);
  const gaveUp = independence === "solution_exposed";

  return (
    <section className={"review-workspace "+(focusMode?"is-focused":"")}>
      <div className="review-session-tools">
        <Link href={returnHref==="/"?"/practice":returnHref} className="review-back-link">← {returnHref==="/"?"Study":returnLabel}</Link>
        {phase==="answering"&&answerSurface==="typed"
          ? <button className="practice-focus-jump" type="button" onClick={()=>workingRef.current?.focus()}>Focus working editor</button>
          : null}
        <button className="review-focus-toggle" type="button" aria-pressed={focusMode} onClick={()=>setFocusMode(value=>!value)}>{focusMode?"Show navigation":"Focus on question"}</button>
      </div>
      {draftNotice ? <p className="draft-recovery-note" role="status">{draftNotice}</p> : null}
      <PracticeFocusGuide phase={phase==="answering"?"answering":phase==="grading"?"grading":"submitting"}
        sessionType={sessionType} independence={independence} surface={answerSurface}
        seconds={phase==="answering"?elapsed:lockedDuration} expectedMinutes={expected}
        completedQuestions={index} totalQuestions={queue.length} queuedAttempts={summary.queued} />
      <progress className="review-session-progress" value={index} max={queue.length} aria-label="Saved or skipped questions" />
      <article className="panel review-question">
        <div className="question-meta"><span>{current.skillTitle}</span><span>{current.targetDimension} · difficulty {current.question.difficulty}/5</span></div>
        <h2 className="math-question-text"><MathContent text={current.question.prompt}/></h2>
        {phase === "answering" ? <>
          <div className="answer-surface-choice" role="group" aria-label="How are you solving?">
            <button type="button" aria-pressed={answerSurface==="typed"} className={answerSurface==="typed"?"selected":""} onClick={()=>setAnswerSurface("typed")}>Type here</button>
            <button type="button" aria-pressed={answerSurface==="paper"} className={answerSurface==="paper"?"selected":""} onClick={()=>setAnswerSurface("paper")}>Work on paper</button>
          </div>
          {answerSurface==="typed" ? <div className="math-work-editor">
            <div className="math-work-header"><strong>Mathematical working</strong><small>Write the method and reasoning before checking the key.</small></div>
            <div className="math-symbol-row" aria-label="Insert common mathematical notation">
              {["⇒","⇔","∀","∃","∈","⊂","≤","≥","∑","∫","√","∞","∂","≈"].map(symbol=><button key={symbol} type="button" onClick={()=>insertMathSymbol(symbol)} aria-label={`Insert ${symbol} into working`}>{symbol}</button>)}
            </div>
            <details className="math-patterns">
              <summary>Insert a working structure</summary>
              <div className="math-patterns-actions">
                {([
                  ["Proof","Assume ...\\nThen ...\\nTherefore ..."],
                  ["Cases","Case 1: ...\\nCase 2: ...\\nThus ..."],
                  ["Derivation","Start: ...\\n⇒ ...\\n⇒ ..."],
                  ["Integral","∫ f(x) dx = ..."],
                  ["Differential equation","y'(t) = ...; y(0) = ...\\n⇒ ..."],
                  ["Probability","P(A | B) = P(A ∩ B) / P(B) = ..."],
                ] as const).map(([label,structure])=><button type="button" key={label}
                  onClick={()=>insertMathSymbol(structure.replaceAll("\\\\n","\\n"))}>{label}</button>)}
              </div>
            </details>
            <div className="math-latex-actions" aria-label="Insert rendered math">
              {([
                ["Fraction",String.raw`\\(\\frac{a}{b}\\)`],
                ["Superscript",String.raw`\\(x^{n}\\)`],
                ["Root",String.raw`\\(\\sqrt{x}\\)`],
                ["Integral",String.raw`\\[\\int_0^1 f(x)\\,dx\\]`],
                ["Summation",String.raw`\\[\\sum_{n=1}^{\\infty} a_n\\]`],
                ["Matrix",String.raw`\\[\\begin{pmatrix}a & b \\\\ c & d\\end{pmatrix}\\]`],
              ] as const).map(([label,syntax])=><button key={label} type="button"
                onClick={()=>insertMathSymbol(syntax.replaceAll("\\\\","\\").replaceAll("\\( ","\\("))}>{label}</button>)}
            </div>
            <label className="field-label" htmlFor="review-working">Steps, argument or proof <span>Ctrl/⌘ + Enter to lock</span></label>
            <textarea id="review-working" ref={workingRef} className="answer-box math-working-input" value={workingText} onChange={event=>setWorkingText(event.target.value)} maxLength={17000}
              onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();revealForGrading(false);}}}
              placeholder="Definitions → method → transformations → justification… Use plain text or LaTeX-style notation." rows={9} />
            {proofOutline.length>0?<nav className="proof-outline" aria-label="Jump to proof section">
              <span className="section-kicker">Proof outline</span>
              <div>{proofOutline.map(anchor=><button type="button" key={anchor.offset}
                onClick={()=>jumpToProof(anchor.offset)} title={`Go to line ${anchor.line}`}>
                {anchor.label}</button>)}</div>
            </nav>:null}
            <label className="field-label" htmlFor="review-response">Conclusion, final value or key claim <span>Optional for longer proofs</span></label>
            <textarea id="review-response" className="answer-box math-answer-input" value={responseText} onChange={event=>setResponseText(event.target.value)} maxLength={2500}
              onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();revealForGrading(false);}}}
              placeholder="e.g. x = 0 is the unique critical point, or a concise proof conclusion" rows={3} />
            <p className="math-work-helper">Use <code>\\(x^2\\)</code> for inline math or <code>{String.raw`\\[\\frac{a}{b}\\]`}</code> for a display equation. Unsupported TeX stays visible as typed source. Your proof and conclusion remain one attempt; rendering is not mathematical verification.</p>
            {(workingText.trim()||responseText.trim())?<details className="math-reading-view">
              <summary>Preview mathematical reading layout</summary>
              {workingText.trim()?<div><strong>Working / proof</strong><div className="math-proof-reading"><MathContent text={workingText}/></div></div>:null}
              {responseText.trim()?<div><strong>Conclusion</strong><div className="math-proof-reading"><MathContent text={responseText}/></div></div>:null}
            </details>:null}
          </div> : <p className="paper-work-note">Solve independently on paper. When finished, lock your work before revealing the rubric. You can switch to typing to record your reasoning or conclusion.</p>}
          <div className="hint-stack">{current.question.hint_1 ? <button className="hint-button" type="button" onClick={() => showHint(1)} disabled={hint1Visible}>Hint 1</button> : null}{current.question.hint_2 ? <button className="hint-button" type="button" onClick={() => showHint(2)} disabled={hint2Visible}>Hint 2</button> : null}</div>
          {hint1Visible && current.question.hint_1 ? <div className="support-box"><strong>Hint 1</strong><p><MathContent text={current.question.hint_1}/></p></div> : null}
          {hint2Visible && current.question.hint_2 ? <div className="support-box"><strong>Hint 2</strong><p><MathContent text={current.question.hint_2}/></p></div> : null}
          <fieldset className="grade-group confidence-before-reveal"><legend>How confident are you in your answer? <span>Choose before seeing the solution</span></legend>
            <div className="choice-row confidence-row">{[1,2,3,4,5].map(value=><button type="button" key={value} aria-pressed={confidence===value} className={`choice-button ${confidence===value?"selected":""}`} onClick={()=>setConfidence(value)} aria-label={`Confidence ${value} of 5`}>{value}</button>)}</div>
            <small>1 = guessing or unable to solve · 5 = certain. This rating is locked when you reveal the rubric.</small>
          </fieldset>
          <div className="button-row review-actions"><button className="primary-button button-reset" type="button" disabled={!canLock} onClick={() => revealForGrading(false)}>Lock answer & compare</button><button className="danger-link" type="button" disabled={!canGiveUp} onClick={() => revealForGrading(true)}>I give up — show solution</button><button className="secondary-button button-reset" type="button" onClick={() => void skip()}>Skip without revealing</button></div>
          {!canLock ? <p className="review-gate-note">To compare your work, select confidence and {answerSurface==="typed"?"write your working or conclusion (or switch to paper mode)":"then lock your paper attempt"}.</p> : null}
        </> : <>
          <div className="locked-answer"><span>Your locked answer</span><p className="math-locked-work"><MathContent text={composedResponse.trim() || (answerSurface==="paper"?"Worked on paper.":"No typed answer.")}/></p></div>
          <div className="solution-box"><span>Answer key / rubric</span><p className="math-rubric-text"><MathContent text={current.question.answer_key_or_rubric || "No rubric attached. Check an official solution or a verified course source before assigning a grade."}/></p></div>
          {!hasRubric && !gaveUp ? <label className="rubric-verification">
            <input type="checkbox" checked={verifiedExternally} onChange={event=>setVerifiedExternally(event.target.checked)} disabled={phase==="submitting"} />
            <span>I compared my work with an official or independently verified source. <Link href={courseId?"/courses/"+courseId:"/resources"}>Open source material</Link></span>
          </label> : null}
          <p className={`evidence-note ${creditable ? "" : "evidence-zero"}`}>{creditable ? `Evidence mode: ${independence.replace("_", " ")}. Revealing the rubric after locking does not reduce this.` : "Solution was exposed before answer lock: this attempt records the failure but gives zero mastery credit."}</p>
          <p className="locked-confidence"><strong>Confidence before reveal:</strong> {confidence}/5 · locked before the rubric was shown</p>
          {gaveUp ? <p className="review-gate-note">You revealed the solution without locking an attempt. This records an incorrect answer with zero mastery credit; classify the error to save it.</p>
            : <fieldset className="grade-group" disabled={phase === "submitting"}><legend>How correct was your locked attempt?</legend><div className="choice-row">{(["correct","partial","incorrect"] as StudyAttemptResult[]).map((value)=><button type="button" key={value} aria-pressed={result===value} className={`choice-button ${result===value?"selected":""}`} onClick={()=>{setResult(value);if(value==="correct")setErrorTypes([])}}>{resultLabel(value)}</button>)}</div></fieldset>}
          {result && result !== "correct" ? <fieldset className="grade-group" disabled={phase === "submitting"}><legend>What failed? <span>Choose at least one</span></legend><div className="error-grid">{ERROR_OPTIONS.map((option)=><button type="button" key={option.value} aria-pressed={errorTypes.includes(option.value)} className={`error-chip ${errorTypes.includes(option.value)?"selected":""}`} onClick={()=>toggleError(option.value)}>{option.label}</button>)}</div></fieldset> : null}
          {error ? <p className="error" role="alert">{error}</p> : null}
          <div className="button-row review-actions"><button className="primary-button button-reset" type="button" disabled={!canSubmit} onClick={() => void submitAssessment()}>{phase === "submitting" ? "Saving…" : "Save & next"}</button><span className="review-save-note">Revealed questions must be recorded before moving on.</span></div>
        </>}
      </article>
      {draftStatus==="saved" ? <p className="math-draft-status" role="status">Unfinished work stored in this tab · not synced across devices</p> : null}
      {draftStatus==="unavailable" ? <p className="math-draft-warning" role="status">Browser draft storage is unavailable. Copy your work before navigating away.</p> : null}
      <p className="practice-save-context"><strong>Recovery:</strong> Unfinished drafts are local to this tab. Submitted attempts may queue for account-bound sync if the connection fails; do not clear browser data while sync is pending.</p>
      {notice ? <p className="sync-note" role="status">{notice}</p> : null}
      {sessionStartedAt ? <p className="session-footnote">Session started {new Date(sessionStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</p> : null}
    </section>
  );
}
