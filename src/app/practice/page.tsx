import Link from "next/link";
import { Nav } from "@/components/nav";
import { ReviewSession } from "@/components/review-session";
import { getTodayData } from "@/lib/study/queries";
import { getCheckpointData, getCourseWeekCheckpointData } from "@/lib/study/pulse";
import { weeklyCheckpointSessionNote } from "@/lib/study/course-study-flow";
import { getTargetedRepair } from "@/lib/study/repair";
import { getAvailableExamPapers } from "@/lib/study/exams";
import { getCalibrationPractice, getSemesterCalibration } from "@/lib/study/calibration-data";
import { getStrategyPractice } from "@/lib/study/strategy-data";

export const dynamic = "force-dynamic";

function metric(value:number|null,suffix=""){
  return value==null?"—":String(value)+suffix;
}

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ mode?: string; course?: string; strategy?: string; week?: string; skill?: string; finding?: string }> }) {
  const { mode,course,strategy,week,skill,finding } = await searchParams;
  if(mode==="repair"){
    const data=await getTargetedRepair(course,skill,finding);
    return <main className="shell practice-shell">
      <header className="header"><div><p className="eyebrow">Skill repair · {data.course.display_name}</p><h1>{data.skill.title}</h1></div><Nav /></header>
      {data.finding?<section className="repair-brief" aria-label="Mistake to repair">
        <span className="section-kicker">Original discrepancy</span>
        <h2>{data.finding.title}</h2>
        {data.finding.detail?<p>{data.finding.detail}</p>:null}
        <p className="muted">Solve the questions independently before reviewing any solutions. Returning to this mistake alone is not evidence of mastery.</p>
        {data.sourceLinks.some(source=>source.resource_type==="exercise")?<details><summary>Original exercise sheet</summary><div className="resource-links">{data.sourceLinks.filter(source=>source.resource_type==="exercise").map(source=>source.drive_url?<a key={source.id} href={source.drive_url} target="_blank" rel="noreferrer">{source.title}</a>:<span key={source.id}>{source.title}</span>)}</div></details>:null}
        {data.sourceLinks.some(source=>["solution","exam_solution"].includes(source.resource_type))?<p className="muted tiny">The linked official solution remains in the course binder. It is not linked here before an independent repair attempt.</p>:null}
      </section>:null}
      <ReviewSession queue={data.queue} plannedMinutes={Math.max(1,data.queueMinutes)}
        sessionType="relearning" courseId={data.course.id} eyebrow="Independent repair · exact skill"
        intro="The set draws only from this skill. Lock your full solution and compare it with the source. A later correct, fully independent recorded attempt is required before the finding can be resolved."
        completionNote={data.finding?`Targeted repair for finding ${data.finding.id}`:undefined}
        returnHref={`/courses/${data.course.id}`} returnLabel="Back to course" />
    </main>;
  }
  if(mode==="week"){
    const data=await getCourseWeekCheckpointData(course,week,"week");
    return <main className="shell practice-shell">
      <header className="header"><div><p className="eyebrow">Teaching week {data.weekNo} · Course practice</p><h1>{data.course.display_name}</h1></div><Nav /></header>
      <ReviewSession
        queue={data.queue} plannedMinutes={Math.max(1,data.queueMinutes)}
        sessionType="coursework" courseId={data.course.id}
        eyebrow={`Week ${data.weekNo} · independent course questions`}
        intro="Work through this teaching week's approved questions before consulting the solution. This practice does not automatically certify the exercise-sheet milestone or replace cumulative review."
        returnHref={`/courses/${data.course.id}#week-${data.weekNo}`}
        returnLabel={`Back to week ${data.weekNo}`}
      />
    </main>;
  }
  if(mode==="weekly-checkpoint"){
    const data=await getCourseWeekCheckpointData(course,week);
    return <main className="shell practice-shell">
      <header className="header"><div><p className="eyebrow">Cumulative course check · Week {data.weekNo}</p><h1>{data.course.display_name}</h1></div><Nav /></header>
      <ReviewSession
        queue={data.queue}
        plannedMinutes={Math.max(1,data.queueMinutes)}
        sessionType="checkpoint"
        courseId={data.course.id}
        eyebrow={`Week ${data.weekNo} · closed-book cumulative checkpoint`}
        intro="Practice the current and earlier weeks independently. Your session must contain at least one recorded, non-solution-exposed attempt before its weekly checkpoint can be marked complete."
        completionNote={weeklyCheckpointSessionNote(data.course.id,data.weekNo)}
        returnHref={`/courses/${data.course.id}#week-${data.weekNo}`}
        returnLabel={`Back to week ${data.weekNo}`}
      />
    </main>;
  }
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

  const [data,papers,calibration] = await Promise.all([getTodayData(course),getAvailableExamPapers(),getSemesterCalibration()]);
  const selectedCourse = course ? data.courses.find(item => item.course_id === course) : null;
  return (
    <main className="shell practice-shell">
      <header className="header"><div><p className="eyebrow">{selectedCourse ? "Course review" : "Study"}</p><h1>{selectedCourse ? selectedCourse.display_name : "Practice"}</h1></div><Nav /></header>
      {course ? <div className="course-review-context">
        <p>{selectedCourse ? `Due retrieval for this course only · ${data.dueSkillCount} due skill(s)` : "This course is not in your active semester."}</p>
        <Link href="/practice">Review across all courses →</Link>
      </div> : null}

      <ReviewSession queue={data.queue} plannedMinutes={Math.max(1, data.queueMinutes)}
        courseId={selectedCourse?.course_id ?? undefined}
        eyebrow={selectedCourse ? "Course retrieval" : "Daily retrieval"}
        intro={selectedCourse ? "Review only this course's due skills, within your current daily review budget. Return to all-course review for the full retention queue." : undefined} />

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
