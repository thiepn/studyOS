import Link from "next/link";
import { Nav } from "@/components/nav";
import { ReviewSession } from "@/components/review-session";
import { getTodayData } from "@/lib/study/queries";
import { getCheckpointData } from "@/lib/study/pulse";
import { getAvailableExamPapers } from "@/lib/study/exams";
import { getCalibrationPractice, getSemesterCalibration } from "@/lib/study/calibration-data";
import { getStrategyPractice } from "@/lib/study/strategy-data";

export const dynamic = "force-dynamic";

function metric(value:number|null,suffix=""){
  return value==null?"—":String(value)+suffix;
}

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ mode?: string; course?: string; strategy?: string }> }) {
  const { mode,course,strategy } = await searchParams;
  if(mode==="checkpoint"){
    const data=await getCheckpointData();
    const rotation=data.rotation;
    return (
      <main className="shell practice-shell">
        <header className="header"><div><p className="eyebrow">Cumulative retrieval</p><h1>{rotation?.display_name ?? "Checkpoint"}</h1></div><Nav /></header>
        {rotation?.completed ? <p className="checkpoint-notice">This week&apos;s checkpoint is already complete. Re-running it is optional and will create another checkpoint session.</p> : null}
        <ReviewSession
          queue={data.queue}
          plannedMinutes={Math.max(1,data.queueMinutes)}
          sessionType="checkpoint"
          courseId={rotation?.course_id}
          eyebrow={rotation ? "Week " + rotation.target_week_no + " cumulative checkpoint" : "Cumulative checkpoint"}
          intro="Solve cumulatively and closed-book. Older material is deliberately favored, but weak, lapsed, prerequisite-heavy, and exam-important skills can override age. This session is separate from the 40-minute daily retention cap."
        />
      </main>
    );
  }

  if(mode==="calibration"){
    const data=await getCalibrationPractice(course);
    return (
      <main className="shell practice-shell">
        <header className="header"><div><p className="eyebrow">Adaptive calibration</p><h1>{data.course?.displayName ?? "Calibration"}</h1></div><Nav /></header>
        {data.profile ? <section className="panel calibration-session-context">
          <div><p className="eyebrow">{data.profile.status}</p><h2>{data.profile.independentAttempts} independent attempts · {data.profile.distinctSkills} skills sampled</h2></div>
          <p>{data.profile.recommendation}</p>
        </section> : null}
        <ReviewSession
          queue={data.queue}
          plannedMinutes={Math.max(1,data.queueMinutes)}
          sessionType="coursework"
          courseId={data.course?.courseId}
          eyebrow="20-minute calibration set"
          intro="Work closed-book and lock your answer before checking the rubric. Early calibration deliberately samples broadly; only a usable evidence sample may mildly favor a weak dimension or adjust difficulty."
        />
      </main>
    );
  }

  if(mode==="drift"){
    const data=await getCalibrationPractice(course);
    return (
      <main className="shell practice-shell">
        <header className="header"><div><p className="eyebrow">Drift repair</p><h1>{data.course?.displayName ?? "Drift repair"}</h1></div><Nav /></header>
        {data.profile ? <section className="panel calibration-session-context">
          <div><p className="eyebrow">bounded intervention</p><h2>{data.profile.status} calibration · {data.profile.independentAttempts} independent attempts</h2></div>
          <p>{data.profile.recommendation}</p>
        </section> : null}
        <ReviewSession
          queue={data.queue}
          plannedMinutes={Math.max(1,data.queueMinutes)}
          sessionType="relearning"
          courseId={data.course?.courseId}
          eyebrow="Targeted drift repair"
          intro="This is a bounded correction inside your existing daily capacity. Work independently and closed-book. StudyOS will judge the intervention only from later independent evidence, not from performance inside this repair session itself."
          completionNote="Targeted drift repair intervention"
        />
      </main>
    );
  }

  if(mode==="strategy"){
    const data=await getStrategyPractice(course,strategy);
    return (
      <main className="shell practice-shell">
        <header className="header"><div><p className="eyebrow">Method experiment</p><h1>{data.course?.displayName ?? "Strategy experiment"}</h1></div><Nav /></header>
        {data.strategy ? <section className="panel strategy-session-context">
          <div><p className="eyebrow">{data.strategy.title}</p><h2>{data.strategy.purpose}</h2></div>
          <p>{data.strategy.instructions}</p>
          <small>{data.strategy.budgetMinutes} minute ceiling · target {data.strategy.targetDimensions.join(" + ")} · later transfer evidence decides whether this method survives.</small>
        </section> : <section className="panel empty-state">
          <h2>No method experiment should start yet</h2>
          <p>{data.course?.recommendation.reason ?? "No strategy is available."}</p>
          {data.course ? <Link className="secondary-button" href={"/strategy?course="+data.course.courseId}>Back to strategy lab</Link> : null}
        </section>}
        {data.strategy ? <ReviewSession
          queue={data.queue}
          plannedMinutes={Math.max(1,data.queueMinutes||data.strategy.budgetMinutes)}
          sessionType="relearning"
          courseId={data.course?.courseId}
          eyebrow={"Method · "+data.strategy.title}
          intro={data.strategy.instructions+" This session tests the method; its own score will not count as proof that the method works. StudyOS will judge later independent transfer."}
          completionNote={data.completionNote ?? undefined}
        /> : null}
      </main>
    );
  }

  const [data,papers,calibration] = await Promise.all([getTodayData(),getAvailableExamPapers(),getSemesterCalibration()]);
  return (
    <main className="shell practice-shell">
      <header className="header"><div><p className="eyebrow">Study</p><h1>Practice</h1></div><Nav /></header>

      <ReviewSession queue={data.queue} plannedMinutes={Math.max(1, data.queueMinutes)} />

      <section className="practice-modes" aria-label="Other study modes">
        <div className="practice-modes-heading"><span className="section-kicker">Other modes</span><h2>Use these when the evidence calls for them.</h2></div>

        <details className="practice-mode-drawer">
          <summary><span><strong>Calibration sets</strong><small>Build or refresh a trustworthy course baseline</small></span><b>{calibration.filter((item)=>item.profile.needsCalibration).length} due</b></summary>
          <div className="practice-mode-list">
            {calibration.map((item)=><article key={item.courseId}>
              <div><span>{item.shortName ?? item.displayName}</span><strong>{item.profile.status}</strong><small>{item.profile.independentAttempts}/12 independent · {metric(item.profile.accuracyPercent,"%")} accuracy · {item.profile.distinctSkills}/4 skills</small></div>
              <Link className={item.profile.needsCalibration?"primary-button":"secondary-button"} href={"/practice?mode=calibration&course="+item.courseId}>{item.profile.needsCalibration?"Calibrate":"Adaptive set"}</Link>
            </article>)}
          </div>
        </details>

        {papers.length ? <details className="practice-mode-drawer">
          <summary><span><strong>Timed past exams</strong><small>Full-duration, closed-book exam evidence</small></span><b>{papers.length} available</b></summary>
          <div className="practice-mode-list">
            {papers.map((paper)=><Link className="practice-paper-row" href={"/practice/exam/"+paper.exam_id} key={paper.exam_id}>
              <div><span>{paper.course.short_name ?? paper.course.display_name}</span><strong>{paper.title}</strong><small>{paper.year_label ?? "year ?"} · {paper.duration_minutes ?? "?"} min · {paper.total_points ?? paper.question_points} pts</small></div>
              <b>Start →</b>
            </Link>)}
          </div>
        </details> : null}
      </section>
    </main>
  );
}
