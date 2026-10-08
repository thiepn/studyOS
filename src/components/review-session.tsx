"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StudyAttemptResult, StudyErrorType, StudyIndependence } from "@/lib/supabase/database.types";
import type { QueueItem } from "@/lib/study/types";
import { assessmentReady, assessmentSourceVerified, canRevealRubric, escalateIndependence, isMasteryCreditable, resultLabel } from "@/lib/study/review-state";
import { submitAttemptWithFallback } from "@/lib/study/offline-attempts";
import { finishSessionWithFallback, startSessionWithFallback } from "@/lib/study/offline-sessions";
import { composeProblemWork } from "@/lib/study/problem-work";

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
  const [lockedDuration, setLockedDuration] = useState(0);
  const [responseText, setResponseText] = useState("");
  const [workingText,setWorkingText]=useState("");
  const workingRef=useRef<HTMLTextAreaElement>(null);
  const composedResponse=composeProblemWork(workingText,responseText);
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

  useEffect(() => {
    if (phase !== "answering" || !questionStartedAt) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - Date.parse(questionStartedAt)) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [phase, questionStartedAt]);

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
    const duration = questionStartedAt ? Math.max(1, Math.floor((Date.now() - Date.parse(questionStartedAt)) / 1000)) : Math.max(1, elapsed);
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
    setPhase("complete");
  }

  async function submitAssessment() {
    if (!current || !result || !assessmentReady(result, confidence, errorTypes)
      || !assessmentSourceVerified(Boolean(current.question.answer_key_or_rubric?.trim()), verifiedExternally, independence)) return;
    setPhase("submitting"); setError(null);
    const completedAt = new Date().toISOString();
    try {
      const submitted = await submitAttemptWithFallback({
        clientRequestId: crypto.randomUUID(), questionId: current.question.id, sessionId: sessionId ?? undefined,
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

  if (phase === "ready" || phase === "starting") return (
    <section className="panel review-start">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{queue.length} questions · {plannedMinutes} planned minutes</h2>
      <p>{intro ?? "Work from memory first. Hints lower evidentiary strength. If you give up and reveal the solution before locking an answer, the attempt receives no mastery credit and becomes a repair item."}</p>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button className="primary-button button-reset" type="button" disabled={phase === "starting"} onClick={() => void start()}>{phase === "starting" ? "Starting…" : "Start review"}</button>
    </section>
  );

  if (phase === "complete") return (
    <section className="panel review-complete">
      <p className="eyebrow">{sessionType === "checkpoint" ? "Checkpoint complete" : "Session complete"}</p><h2>{summary.attempted} attempts completed</h2>
      <div className="summary-grid"><div><strong>{summary.correct}</strong><span>correct</span></div><div><strong>{summary.partial}</strong><span>partial</span></div><div><strong>{summary.incorrect}</strong><span>incorrect</span></div><div><strong>{summary.skipped}</strong><span>skipped</span></div></div>
      <p>{formatSeconds(summary.seconds)} active solving time{summary.queued ? ` · ${summary.queued} attempt(s) waiting for sync` : ""}.</p>
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
        <button className="review-focus-toggle" type="button" aria-pressed={focusMode} onClick={()=>setFocusMode(value=>!value)}>{focusMode?"Show navigation":"Focus on question"}</button>
      </div>
      <div className="review-topline" aria-live="polite">
        <span>Question {index + 1} of {queue.length}</span>
        <span>{formatSeconds(phase === "answering" ? elapsed : lockedDuration)} · target {expected} min</span>
      </div>
      <progress className="review-session-progress" value={index} max={queue.length} aria-label="Questions completed" />
      <article className="panel review-question">
        <div className="question-meta"><span>{current.skillTitle}</span><span>{current.targetDimension} · difficulty {current.question.difficulty}/5</span></div>
        <h2>{current.question.prompt}</h2>
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
            <label className="field-label" htmlFor="review-working">Steps, argument or proof <span>Ctrl/⌘ + Enter to lock</span></label>
            <textarea id="review-working" ref={workingRef} className="answer-box math-working-input" value={workingText} onChange={event=>setWorkingText(event.target.value)} maxLength={17000}
              onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();revealForGrading(false);}}}
              placeholder="Definitions → method → transformations → justification… Use plain text or LaTeX-style notation." rows={9} />
            <label className="field-label" htmlFor="review-response">Conclusion, final value or key claim <span>Optional for longer proofs</span></label>
            <textarea id="review-response" className="answer-box math-answer-input" value={responseText} onChange={event=>setResponseText(event.target.value)} maxLength={2500}
              onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();revealForGrading(false);}}}
              placeholder="e.g. x = 0 is the unique critical point, or a concise proof conclusion" rows={3} />
            <p className="math-work-helper">Your working and conclusion are stored together in the existing attempt record. This editor does not automatically check mathematical correctness.</p>
          </div> : <p className="paper-work-note">Solve independently on paper. When finished, lock your work before revealing the rubric. You can switch to typing to record your reasoning or conclusion.</p>}
          <div className="hint-stack">{current.question.hint_1 ? <button className="hint-button" type="button" onClick={() => showHint(1)} disabled={hint1Visible}>Hint 1</button> : null}{current.question.hint_2 ? <button className="hint-button" type="button" onClick={() => showHint(2)} disabled={hint2Visible}>Hint 2</button> : null}</div>
          {hint1Visible && current.question.hint_1 ? <div className="support-box"><strong>Hint 1</strong><p>{current.question.hint_1}</p></div> : null}
          {hint2Visible && current.question.hint_2 ? <div className="support-box"><strong>Hint 2</strong><p>{current.question.hint_2}</p></div> : null}
          <fieldset className="grade-group confidence-before-reveal"><legend>How confident are you in your answer? <span>Choose before seeing the solution</span></legend>
            <div className="choice-row confidence-row">{[1,2,3,4,5].map(value=><button type="button" key={value} aria-pressed={confidence===value} className={`choice-button ${confidence===value?"selected":""}`} onClick={()=>setConfidence(value)} aria-label={`Confidence ${value} of 5`}>{value}</button>)}</div>
            <small>1 = guessing or unable to solve · 5 = certain. This rating is locked when you reveal the rubric.</small>
          </fieldset>
          <div className="button-row review-actions"><button className="primary-button button-reset" type="button" disabled={!canLock} onClick={() => revealForGrading(false)}>Lock answer & compare</button><button className="danger-link" type="button" disabled={!canGiveUp} onClick={() => revealForGrading(true)}>I give up — show solution</button><button className="secondary-button button-reset" type="button" onClick={() => void skip()}>Skip without revealing</button></div>
          {!canLock ? <p className="review-gate-note">To compare your work, select confidence and {answerSurface==="typed"?"write your working or conclusion (or switch to paper mode)":"then lock your paper attempt"}.</p> : null}
        </> : <>
          <div className="locked-answer"><span>Your locked answer</span><p className="math-locked-work">{composedResponse.trim() || (answerSurface==="paper"?"Worked on paper.":"No typed answer.")}</p></div>
          <div className="solution-box"><span>Answer key / rubric</span><p>{current.question.answer_key_or_rubric || "No rubric attached. Check an official solution or a verified course source before assigning a grade."}</p></div>
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
      {notice ? <p className="sync-note">{notice}</p> : null}
      {sessionStartedAt ? <p className="session-footnote">Session started {new Date(sessionStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</p> : null}
    </section>
  );
}
