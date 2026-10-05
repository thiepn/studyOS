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
        <header className="header"><div><p className="eyebrow">P13 · adaptive calibration</p><h1>{data.course?.displayName ?? "Calibration"}</h1></div><Nav /></header>
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
        <header className="header"><div><p className="eyebrow">P14 → P15 · drift repair</p><h1>{data.course?.displayName ?? "Drift repair"}</h1></div><Nav /></header>
        {data.profile ? <section className="panel calibration-session-context">
          <div><p className="eyebrow">bounded intervention</p><h2>{data.profile.status} calibration · {data.profile.independentAttempts} independent attempts</h2></div>
          <p>{data.profile.recommendation}</p>
        </section> : null}
        <ReviewSession
          queue={data.queue}
          plannedMinutes={Math.max(1,data.queueMinutes)}
          sessionType="relearning"
          courseId={data.course?.courseId}
          eyebrow="P14 targeted drift repair"
          intro="This is a bounded correction inside your existing daily capacity. Work independently and closed-book. P15 will judge the intervention only from later independent evidence, not from performance inside this repair session itself."
          completionNote="P14 drift repair intervention"
        />
      </main>
    );
  }

  if(mode==="strategy"){
    const data=await getStrategyPractice(course,strategy);
    return (
      <main className="shell practice-shell">
        <header className="header"><div><p className="eyebrow">P16 · controlled method experiment</p><h1>{data.course?.displayName ?? "Strategy experiment"}</h1></div><Nav /></header>
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
          eyebrow={"P16 · "+data.strategy.title}
          intro={data.strategy.instructions+" This session tests the method; its own score will not count as proof that the method works. P16 will judge later independent transfer."}
          completionNote={data.completionNote ?? undefined}
        /> : null}
      </main>
    );
  }

  const [data,papers,calibration] = await Promise.all([getTodayData(),getAvailableExamPapers(),getSemesterCalibration()]);
  return (
    <main className="shell practice-shell">
      <header className="header"><div><p className="eyebrow">Retrieval engine</p><h1>Practice</h1></div><Nav /></header>

      <section className="panel calibration-overview">
        <div className="section-heading"><div><p className="eyebrow">P13 · first-week calibration</p><h2>Build a trustworthy starting profile</h2></div><span>{calibration.filter((c)=>!c.profile.needsCalibration).length}/{calibration.length}</span></div>
        <p className="muted">Calibration uses independent attempts, confidence, timing, evidence dimensions, and error diagnoses. Before the sample is usable, StudyOS keeps practice broad instead of overfitting to a few early results.</p>
        <div className="calibration-card-grid">
          {calibration.map((item)=><article className="calibration-card" key={item.courseId}>
            <div className="calibration-card-head"><div><strong>{item.shortName ?? item.displayName}</strong><span>{item.profile.status}</span></div><b>{item.profile.independentAttempts}/12</b></div>
            <div className="calibration-metrics">
              <span><strong>{metric(item.profile.accuracyPercent,"%")}</strong> accuracy</span>
              <span><strong>{metric(item.profile.confidenceGap,"%")}</strong> confidence gap</span>
              <span><strong>{item.profile.paceRatio==null?"—":item.profile.paceRatio.toFixed(2)+"×"}</strong> pace</span>
              <span><strong>{item.profile.distinctSkills}/4</strong> skills</span>
            </div>
            <p>{item.profile.recommendation}</p>
            <Link className={item.profile.needsCalibration?"primary-button":"secondary-button"} href={"/practice?mode=calibration&course="+item.courseId}>{item.profile.needsCalibration?"Run calibration set":"Run adaptive set"}</Link>
          </article>)}
        </div>
      </section>

      {papers.length ? <section className="panel practice-exams">
        <div className="section-heading"><div><p className="eyebrow">Exam simulation</p><h2>Timed Altklausuren</h2></div><span>{papers.length}</span></div>
        <p className="muted">Use real mapped papers for closed-book, full-duration evidence. Verified/official solutions can feed exam mastery; provisional self-grading cannot.</p>
        <div className="practice-exam-list">{papers.map((paper)=><Link className="practice-exam-link" href={"/practice/exam/"+paper.exam_id} key={paper.exam_id}><div><strong>{paper.title}</strong><span>{paper.course.short_name ?? paper.course.display_name} · {paper.year_label ?? "year ?"} · {paper.duration_minutes ?? "?"} min</span></div><b>{paper.total_points ?? paper.question_points} pts</b></Link>)}</div>
      </section> : null}
      <ReviewSession queue={data.queue} plannedMinutes={Math.max(1, data.queueMinutes)} />
    </main>
  );
}
