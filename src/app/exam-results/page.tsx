import Link from "next/link";
import { Nav } from "@/components/nav";
import { ExamResultForm } from "@/components/exam-result-form";
import { getExamResultsData } from "@/lib/study/exam-results-data";
import { normalizeStoredExamResult, reconcileExamOutcome, structuralResultAction } from "@/lib/study/exam-results";

export const dynamic="force-dynamic";

function pretty(value:string|null|undefined){return value?value.replaceAll("_"," "):"—";}
function fmtTime(iso:string|null,timezone="Europe/Berlin"){
  if(!iso)return "—";
  return new Date(iso).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:timezone});
}
function resultTitle(row:any){
  if(!row)return "No result";
  const mark=row.grade_text?" · "+row.grade_text:row.score_percent!=null?" · "+row.score_percent+"%":"";
  return pretty(row.outcome)+mark;
}

export default async function ExamResultsPage(){
  const data=await getExamResultsData();
  const intake=data.courses.filter(course=>course.resultReady);
  const history=data.courses.filter(course=>course.history.length);
  const timezone=data.timezone;

  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">P24 · outcome reconciliation</p><h1>Exam results</h1></div>
      <Nav />
    </header>

    <section className="panel exam-results-hero">
      <div className="section-heading">
        <div><p className="eyebrow">Actual semester outcomes</p><h2>{data.results.length} recorded attempt{data.results.length===1?"":"s"}</h2></div>
        <span>{data.completedCourses.length} passed</span>
      </div>
      <div className="exam-results-summary">
        <span><strong>{data.completedCourses.length}</strong> completed courses</span>
        <span><strong>{data.pendingRetakes.length}</strong> retake decisions pending</span>
        <span><strong>{data.plannedRetakes.length}</strong> planned retakes</span>
        <span><strong>{data.courses.filter(course=>course.active).length}</strong> active courses</span>
      </div>
      <p className="forecast-disclaimer">P24 compares outcomes with the P17 readiness snapshot only directionally. A readiness index was never a predicted grade or probability of passing, so StudyOS does not score forecast “accuracy” by subtracting an exam mark from readiness.</p>
    </section>

    <section className="panel exam-result-intake">
      <div className="section-heading">
        <div><p className="eyebrow">Result intake</p><h2>Record or resolve an outcome</h2></div>
        <span>{intake.length} ready</span>
      </div>
      <ExamResultForm courses={intake.map(course=>({
        courseId:course.courseId,displayName:course.displayName,shortName:course.shortName,
        examAt:course.examAt,resultReady:course.resultReady,nextAttemptNo:course.nextAttemptNo,
        latest:course.latest,latestOfficial:course.latestOfficial,
      }))}/>
    </section>

    {history.length?<section className="exam-result-course-grid">
      {history.map(course=>{
        const latest=course.latest;
        if(!latest)return null;
        const stored=normalizeStoredExamResult(latest);
        const reconciliation=reconcileExamOutcome({
          resultStatus:stored.resultStatus,outcome:stored.outcome,
          snapshot:{
            readinessIndex:latest.readiness_index_snapshot==null?null:Number(latest.readiness_index_snapshot),
            readinessBand:latest.readiness_band_snapshot,
            decisionPriority:latest.decision_priority_snapshot==null?null:Number(latest.decision_priority_snapshot),
          },
        });
        const action=structuralResultAction(stored);
        return <article className={"panel exam-result-course outcome-"+latest.outcome} key={course.courseId}>
          <div className="exam-result-course-head">
            <div><p className="eyebrow">{pretty(latest.result_status)} · attempt {latest.attempt_no}</p><h2>{course.shortName??course.displayName}</h2></div>
            <span>{course.active?"active":"closed"}</span>
          </div>
          <h3>{resultTitle(latest)}</h3>
          <div className="exam-result-metrics">
            <span><strong>{latest.readiness_index_snapshot==null?"—":Number(latest.readiness_index_snapshot).toFixed(0)+"/100"}</strong> P17 snapshot</span>
            <span><strong>{pretty(latest.readiness_band_snapshot)}</strong> readiness band</span>
            <span><strong>{pretty(reconciliation?.alignment)}</strong> reconciliation</span>
            <span><strong>{pretty(latest.retake_decision)}</strong> retake</span>
          </div>
          <p>{reconciliation?.summary}</p>
          <p className="exam-result-structural"><strong>Structural state:</strong> {pretty(action)}{latest.next_exam_at?" · next exam "+fmtTime(latest.next_exam_at,timezone):""}</p>
          {latest.source_url?<p><a href={latest.source_url} target="_blank" rel="noreferrer">Open result source</a></p>:null}
          {latest.source_note?<p className="muted">{latest.source_note}</p>:null}
        </article>;
      })}
    </section>:null}

    {history.length?<section className="panel exam-result-history">
      <div className="section-heading"><div><p className="eyebrow">Attempt history</p><h2>Recorded outcomes</h2></div><span>{data.results.length}</span></div>
      <div className="exam-result-history-list">
        {data.courses.flatMap(course=>course.history.map((row:any)=>({course,row}))).sort((a,b)=>Date.parse(b.row.exam_at)-Date.parse(a.row.exam_at)).map(({course,row})=><article key={row.id}>
          <div><strong>{course.shortName??course.displayName} · attempt {row.attempt_no}</strong><span>{resultTitle(row)}</span></div>
          <small>{pretty(row.result_status)} · exam {fmtTime(row.exam_at,timezone)} · recorded {fmtTime(row.recorded_at,timezone)} · retake {pretty(row.retake_decision)}</small>
        </article>)}
      </div>
    </section>:null}

    <section className="panel">
      <p className="eyebrow">Outcome workflow</p>
      <h2>After an official result</h2>
      <p>A pass closes the course. A planned retake reactivates it as a retake with the new exam date. A pending retake decision pauses discretionary planning without deleting any evidence. Declining a retake closes the course without marking it passed.</p>
      <div className="button-row"><Link className="secondary-button" href="/exam-day">Exam-day operations</Link><Link className="secondary-button" href="/outlook">Semester outlook</Link></div>
    </section>
  </main>;
}
