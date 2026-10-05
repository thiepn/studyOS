import Link from "next/link";
import { Nav } from "@/components/nav";
import { getCourseStrategyPortfolio } from "@/lib/study/strategy-data";
import { STRATEGIES } from "@/lib/study/strategy";

export const dynamic="force-dynamic";

function pct(value:number|null){return value==null?"—":value+"%";}

export default async function StrategyPage({searchParams}:{searchParams:Promise<{course?:string}>}){
  const {course:courseId}=await searchParams;
  const data=await getCourseStrategyPortfolio(courseId);
  const course=data.course;
  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">P16 · method experimentation</p><h1>Strategy lab</h1></div>
      <Nav />
    </header>

    {!course ? <section className="panel empty-state"><h2>No major course available</h2><p>Initialize the semester before running method experiments.</p></section> : <>
      <section className="panel strategy-hero">
        <div className="strategy-hero-head">
          <div><p className="eyebrow">{course.difficultySignal.replaceAll("_"," ")} signal</p><h2>{course.displayName}</h2></div>
          <span>{course.experiments.length} experiment{course.experiments.length===1?"":"s"}</span>
        </div>
        <p>{course.recommendation.reason}</p>
        {course.recommendation.awaitingEvidence ? <div className="strategy-hold">
          <strong>Experiment hold</strong>
          <span>Collect normal independent coursework/review evidence before switching methods. A second experiment now would contaminate the comparison.</span>
        </div> : null}
        {course.recommendation.recommended ? <div className="strategy-recommended">
          <div>
            <p className="eyebrow">Recommended next method</p>
            <h3>{course.recommendation.recommended.title}</h3>
            <p>{course.recommendation.recommended.purpose}</p>
            <small>{course.recommendation.recommended.budgetMinutes} min · target {course.recommendation.recommended.targetDimensions.join(" + ")}</small>
          </div>
          <Link className="primary-button" href={"/practice?mode=strategy&course="+course.courseId+"&strategy="+course.recommendation.recommended.key}>Run controlled experiment</Link>
        </div> : null}
        {course.recommendation.escalation==="change_source" ? <div className="strategy-escalation">
          <strong>Change the explanation source</strong>
          <p>Multiple methods have already failed. Pair the next experiment with a different textbook, lecture explanation, tutorial sheet, or instructor explanation rather than recycling the same representation.</p>
        </div> : null}
        {course.recommendation.escalation==="external_support" ? <div className="strategy-escalation strategy-external">
          <strong>Escalate beyond self-practice</strong>
          <p>The in-app portfolio is exhausted. Bring the specific failed skills/errors to a tutorial, office hour, lecturer, tutor, or knowledgeable peer instead of adding more solo practice.</p>
          <Link className="secondary-button" href={"/courses/"+course.courseId}>Open course evidence</Link>
        </div> : null}
      </section>

      <section className="strategy-course-switch">
        {data.courses.map((item)=><Link key={item.courseId} className={item.courseId===course.courseId?"strategy-course-chip active":"strategy-course-chip"} href={"/strategy?course="+item.courseId}>
          {item.shortName??item.displayName}
        </Link>)}
      </section>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Method portfolio</p><h2>Try different mechanisms, not more of the same</h2></div><span>{STRATEGIES.length}</span></div>
        <div className="strategy-grid">
          {STRATEGIES.map((strategy)=>{
            const status=course.recommendation.statusByKey[strategy.key];
            const history=course.recommendation.histories.find((item)=>item.key===strategy.key);
            const available=status!=="retired"&&!course.recommendation.awaitingEvidence;
            return <article className={"strategy-card strategy-"+status} key={strategy.key}>
              <div className="strategy-card-head"><div><strong>{strategy.title}</strong><span>{status}</span></div><b>{history?.evaluated??0} eval.</b></div>
              <p>{strategy.purpose}</p>
              <div className="strategy-card-metrics">
                <span><strong>{history?.experiments??0}</strong> runs</span>
                <span><strong>{history?.effective??0}</strong> effective</span>
                <span><strong>{pct(history?.effectivenessRate??null)}</strong> transfer</span>
                <span><strong>{strategy.budgetMinutes}</strong> min</span>
              </div>
              <small>{strategy.instructions}</small>
              {available ? <Link className="secondary-button" href={"/practice?mode=strategy&course="+course.courseId+"&strategy="+strategy.key}>Test this method</Link> : null}
            </article>;
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Experiment history</p><h2>Transfer after the method</h2></div><span>{course.experiments.length}</span></div>
        {course.experiments.length ? <div className="strategy-history">
          {course.experiments.map((experiment)=><article key={experiment.sessionId}>
            <div><strong>{experiment.strategyTitle}</strong><span>Week {experiment.interventionWeek} · {experiment.outcome.replaceAll("_"," ")}</span></div>
            <b>{experiment.baselineAccuracyPercent==null?"—":experiment.baselineAccuracyPercent+"%"} → {experiment.followupAccuracyPercent==null?"—":experiment.followupAccuracyPercent+"%"}</b>
          </article>)}
        </div> : <p className="muted">No P16 method experiment has been completed yet.</p>}
      </section>
    </>}
  </main>;
}
