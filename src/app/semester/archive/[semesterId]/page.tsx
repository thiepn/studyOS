import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { ArchiveCalendarCleanup } from "@/components/archive-calendar-cleanup";
import { getSemesterCompletionData } from "@/lib/study/semester-completion-data";
import { getSemesterRolloverData } from "@/lib/study/semester-rollover-data";

export const dynamic="force-dynamic";

function pretty(value:string|null|undefined){return value?value.replaceAll("_"," "):"—";}
function credits(value:number){return Number.isInteger(value)?String(value):value.toFixed(1);}
function when(value:string|null,timezone:string){return value?new Date(value).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:timezone}):"—";}

export default async function ArchivedSemesterPage({params}:{params:Promise<{semesterId:string}>}){
  const {semesterId}=await params;
  let data;
  try{data=await getSemesterCompletionData(semesterId);}catch{return notFound();}
  if(data.semesterLifecycle.active)return notFound();
  const history=await getSemesterRolloverData();
  const meta=history.archives.find(row=>String(row.id)===semesterId)??null;

  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">Archived semester</p><h1>{data.semester.displayName}</h1></div>
      <Nav />
    </header>

    <section className="panel archive-ledger-hero">
      <div className="section-heading">
        <div><p className="eyebrow">Historical context</p><h2>Read-only semester ledger</h2></div>
        <span>archived</span>
      </div>
      <p>This semester is no longer an active planning workspace. Its official outcomes, completion ledger, attempts, and weekly execution history remain available as historical evidence.</p>
      <div className="archive-summary-grid">
        <span><strong>{data.summary.passedCourses}/{data.summary.totalCourses}</strong> courses passed</span>
        <span><strong>{credits(data.summary.passedCredits)}</strong> passed credits</span>
        <span><strong>{data.summary.officialAttempts}</strong> official attempts</span>
        <span><strong>{pretty(data.retrospective.status)}</strong> final ledger state</span>
      </div>
      {meta?<ArchiveCalendarCleanup semesterId={semesterId} count={Number(meta.futureBlockCount??0)}/>:null}
    </section>

    <section className="archive-course-list">
      {data.courses.map(course=><article className={"panel archive-course state-"+course.completionState} key={course.courseId}>
        <div className="semester-course-head">
          <div><p className="eyebrow">{course.credits==null?"credits unknown":credits(course.credits)+" credits"}</p><h2>{course.shortName??course.displayName}</h2></div>
          <span>{pretty(course.completionState)}</span>
        </div>
        <p>{course.latestOfficial
          ?"Latest official: "+pretty(course.latestOfficial.outcome)+(course.latestOfficial.gradeText?" · "+course.latestOfficial.gradeText:"")
          :"No official result recorded."}</p>
        {course.attempts.length?<details className="semester-attempt-history"><summary>Attempt history · {course.attempts.length}</summary><div>
          {course.attempts.map(attempt=><article key={attempt.id}><div><strong>Attempt {attempt.attemptNo} · {pretty(attempt.outcome)}</strong><span>{pretty(attempt.resultStatus)}</span></div><small>{when(attempt.examAt,data.timezone)} · readiness {attempt.readinessIndexSnapshot==null?"—":attempt.readinessIndexSnapshot+"/100"}</small></article>)}
        </div></details>:null}
      </article>)}
    </section>

    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Historical retrospective</p><h2>{pretty(data.retrospective.execution.capacitySignal)}</h2></div></div>
      <p>{data.retrospective.execution.summary}</p>
      <div className="archive-summary-grid">
        <span><strong>{data.retrospective.execution.completedWeeks}</strong> completed weeks</span>
        <span><strong>{data.retrospective.execution.medianWeekAdherencePercent==null?"—":data.retrospective.execution.medianWeekAdherencePercent+"%"}</strong> median adherence</span>
        <span><strong>{data.retrospective.forecastReview.negativeSurprises}</strong> negative readiness surprises</span>
        <span><strong>{data.retrospective.execution.sacrificeEvents}</strong> floor sacrifices</span>
      </div>
      <div className="button-row"><Link className="secondary-button" href="/semesters">Back to semester history</Link><Link className="secondary-button" href="/semester">Open active semester</Link></div>
    </section>
  </main>;
}
