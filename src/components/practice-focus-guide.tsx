import {practiceGuide, type PracticePhase} from "@/lib/study/practice-guide";
import type {StudyIndependence} from "@/lib/supabase/database.types";

export function PracticeFocusGuide({phase,sessionType,independence,seconds,expectedMinutes,surface,completedQuestions,totalQuestions,queuedAttempts}:{
  phase:PracticePhase;sessionType:string;independence:StudyIndependence;
  seconds:number;expectedMinutes:number;surface:"typed"|"paper";
  completedQuestions:number;totalQuestions:number;queuedAttempts:number;
}){
  const guide=practiceGuide({phase,sessionType,independence,seconds,expectedMinutes,surface,completedQuestions,totalQuestions,queuedAttempts});
  const stages:[string,string][]=[["solve","Solve"],["compare","Compare"],["record","Record"]];
  return <section className="practice-focus-guide" aria-label="Practice progress and evidence">
    <div className="practice-focus-context">
      <span className="section-kicker">{guide.sessionLabel}</span>
      <strong>Question {guide.completedQuestions+1} / {guide.totalQuestions}</strong>
      <span className="practice-focus-surface">{guide.workSurface}</span>
    </div>
    <ol className="practice-focus-stages" aria-label="Attempt stages">
      {stages.map(([key,label],i)=><li key={key} className={guide.step===key?"active":stages.findIndex(s=>s[0]===guide.step)>i?"done":""}
        aria-current={guide.step===key?"step":undefined}>
        <span aria-hidden="true">{String(i+1).padStart(2,"0")}</span>
        <span>{label}</span>
      </li>)}
    </ol>
    <div className="practice-focus-evidence">
      <p><strong>Active work:</strong> {guide.elapsedMinutes} min <span>· target {guide.targetMinutes} min (not a deadline)</span></p>
      <p className={independence==="solution_exposed"?"practice-evidence-warning":"practice-evidence-neutral"}><strong>Evidence:</strong> {guide.independenceLabel}</p>
      {guide.queuedAttempts>0?<p role="status"><strong>Offline queue:</strong> {guide.queuedAttempts} recorded attempt{guide.queuedAttempts===1?"":"s"} awaiting sync</p>:null}
    </div>
    <p className="practice-focus-instruction">{guide.sourceMessage}</p>
  </section>;
}
