import Link from "next/link";
import { Nav } from "@/components/nav";
import { getSemesterForecast } from "@/lib/study/forecast-data";

export const dynamic="force-dynamic";

function pretty(value:string){return value.replaceAll("_"," ");}
function score(value:number|null){return value==null?"—":String(value);}

export default async function OutlookPage(){
  const outlook=await getSemesterForecast();
  const queue=[...outlook.courses].sort((a,b)=>b.decisionPriority-a.decisionPriority);
  const top=queue[0]??null;
  return <main className="shell">
    <header className="header"><div><p className="eyebrow">Semester readiness</p><h1>Semester outlook</h1></div><Nav /></header>

    <section className="panel forecast-hero">
      <div className="forecast-hero-main">
        <div>
          <p className="eyebrow">Credit-weighted readiness</p>
          <div><span className="metric">{score(outlook.summary.weightedReadinessIndex)}</span><span className="metric-unit"> / 100</span></div>
        </div>
        <div className="forecast-summary-grid">
          <span><strong>{outlook.summary.targetReadyCourses+outlook.summary.strongCourses}</strong> target-ready+</span>
          <span><strong>{outlook.summary.passReadyCourses}</strong> pass-ready</span>
          <span><strong>{outlook.summary.fragileCourses}</strong> fragile</span>
          <span><strong>{outlook.summary.atRiskCourses}</strong> at risk</span>
          <span><strong>{outlook.summary.insufficientEvidenceCourses}</strong> evidence-limited</span>
          <span><strong>{outlook.summary.highConfidenceCourses}</strong> high confidence</span>
        </div>
      </div>
      <p className="forecast-disclaimer">The readiness index is a StudyOS evidence composite, not a predicted exam percentage or probability of passing. Low-evidence courses remain unclassified instead of receiving false precision.</p>
      <div className="button-row"><Link className="secondary-button" href="/scenarios">Plan capacity scenarios</Link></div>
    </section>

    {top ? <section className={"panel forecast-decision forecast-band-"+top.band}>
      <div className="forecast-decision-head">
        <div><p className="eyebrow">Highest strategic value now</p><h2>{top.shortName??top.displayName}</h2></div>
        <span>{top.nextAction.expectedValue}/100 action value</span>
      </div>
      <h3>{top.nextAction.title}</h3>
      <p>{top.nextAction.reason}</p>
      <div className="forecast-action-meta"><span>{top.nextAction.estimatedMinutes} min</span><span>{top.nextAction.authority}</span><span>course priority {top.decisionPriority}/100</span></div>
      <div className="button-row"><Link className="primary-button" href={top.nextAction.href}>Open recommended action</Link></div>
      <small>This view ranks strategic value across courses. Today remains the authority for what actually fits into the current day.</small>
    </section> : null}

    <section className="panel forecast-queue-panel">
      <div className="section-heading"><div><p className="eyebrow">Decision queue</p><h2>What deserves attention first?</h2></div><span>{queue.length}</span></div>
      <div className="forecast-decision-list">
        {queue.map((course,index)=><article key={course.courseId}>
          <div className="forecast-rank">{index+1}</div>
          <div><strong>{course.shortName??course.displayName}</strong><span>{course.nextAction.title}</span></div>
          <div><b>{course.decisionPriority}</b><span>priority</span></div>
        </article>)}
      </div>
    </section>

    <section className="forecast-course-list">
      {outlook.courses.map((course)=><article className={"panel forecast-course forecast-band-"+course.band} id={"forecast-"+course.courseId} key={course.courseId}>
        <div className="forecast-course-head">
          <div><p className="eyebrow">{pretty(course.courseKind)} · {pretty(course.runway)} runway</p><h2>{course.displayName}</h2></div>
          <div className="forecast-readiness">
            <span className={"forecast-badge forecast-"+course.band}>{pretty(course.band)}</span>
            <strong>{course.readinessIndex==null?"—":course.readinessIndex+"/100"}</strong>
          </div>
        </div>

        <div className="forecast-metrics">
          <span><strong>{course.confidence.replace("_"," ")}</strong> confidence</span>
          <span><strong>{course.evidenceScore}/100</strong> evidence</span>
          <span><strong>{pretty(course.trajectory)}</strong> trajectory</span>
          <span><strong>{course.readinessRange?course.readinessRange.low+"–"+course.readinessRange.high:"—"}</strong> readiness range</span>
          <span><strong>{course.decisionPriority}/100</strong> decision priority</span>
          <span><strong>{course.credits??"—"}</strong> credits</span>
        </div>

        <p className="forecast-course-summary">{course.summary}</p>

        <div className="forecast-component-grid">
          {course.components.map((component)=><div key={component.key}>
            <span>{component.label}</span>
            <strong>{component.value}%</strong>
            <small>{Math.round(component.weight*100)}% model weight</small>
          </div>)}
        </div>

        <div className="forecast-evidence-columns">
          <div>
            <h3>Supports</h3>
            {course.supports.length?<ul>{course.supports.map((item)=><li key={item}>{item}</li>)}</ul>:<p className="muted">No strong positive signal is established yet.</p>}
          </div>
          <div>
            <h3>Blockers</h3>
            {course.blockers.length?<ul>{course.blockers.map((item)=><li key={item}>{item}</li>)}</ul>:<p className="muted">No major blocker is currently supported by the evidence.</p>}
          </div>
        </div>

        <div className="forecast-next-action">
          <div>
            <p className="eyebrow">Highest-value next action · {course.nextAction.authority}</p>
            <h3>{course.nextAction.title}</h3>
            <p>{course.nextAction.reason}</p>
          </div>
          <div className="forecast-next-action-side"><b>{course.nextAction.expectedValue}/100</b><span>{course.nextAction.estimatedMinutes} min</span></div>
        </div>
        <div className="button-row">
          <Link className="primary-button" href={course.nextAction.href}>Open action</Link>
          <Link className="secondary-button" href={"/progress#course-"+course.courseId}>Inspect diagnostics</Link>
          <Link className="secondary-button" href={"/courses/"+course.courseId}>Open course</Link>
        </div>
      </article>)}
    </section>
  </main>;
}
