import Link from "next/link";
import { Nav } from "@/components/nav";
import { DailyPlan } from "@/components/daily-plan";
import { CapacityControls } from "@/components/capacity-controls";
import { CommitmentsPanel } from "@/components/commitments-panel";
import { getDailyOrchestration } from "@/lib/study/planning";
import { getCalendarAutopilot } from "@/lib/study/calendar-autopilot";
import { CalendarAutopilotPanel } from "@/components/calendar-autopilot-panel";
import { topRiskDrivers } from "@/lib/study/pulse";
import type { PlanningMode } from "@/lib/study/planner";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const orchestration=await getDailyOrchestration();
  const calendar=await getCalendarAutopilot(orchestration);
  const {today:data,pulse,capacity,plan,commitments,courses,settings}=orchestration;
  const topRisk=pulse.risks[0] ?? null;
  const checkpoint=pulse.checkpoint;
  const examCourses=pulse.risks.filter((course)=>course.operating_mode==="exam"||course.operating_mode==="transition");
  const activeDrift=[...orchestration.drift.courses]
    .filter((course)=>["watch","drifting","critical"].includes(course.profile.band))
    .sort((a,b)=>b.profile.score-a.profile.score);
  const topDrift=activeDrift[0]??null;
  const interventionConcern=[...orchestration.learningAnalytics.courses]
    .filter((course)=>course.analytics.difficultySignal==="structural"||course.analytics.difficultySignal==="persistent")
    .sort((a,b)=>Number(b.analytics.difficultySignal==="structural")-Number(a.analytics.difficultySignal==="structural"))[0]??null;
  const topForecast=[...orchestration.forecast.courses].sort((a,b)=>b.decisionPriority-a.decisionPriority)[0]??null;
  const examCommand=orchestration.examCommand;
  const examOperations=orchestration.examOperations;
  const examOutcomeState=orchestration.examOutcomeState;
  const topExamCommand=examCommand.courses[0]??null;
  const pendingRetake=examOutcomeState.pendingRetakes[0]??null;
  const resultReady=examOutcomeState.ready[0]??null;
  const weekRuntime=orchestration.weekRuntime;
  const pendingPostExam=examOperations.courses.find(course=>
    course.phase==="post_exam"&&
    (weekRuntime?.progress.courses.find(row=>row.courseId===course.courseId)?.remainingMinutes??0)>0
  )??null;
  const activeExamBoundary=examOperations.inProgress[0]
    ??(examOperations.recoveryLevel!=="none"?examOperations.latestCompleted:null)
    ??examOperations.courses.find(course=>course.phase==="final_window")
    ??pendingPostExam
    ??null;
  const weekConcern=weekRuntime?.progress.courses
    .filter(course=>course.remainingMinutes>0)
    .sort((a,b)=>{
      const rank=(value:string)=>value==="behind"||value==="not_started"?3:value==="on_track"?2:value==="ahead"?1:0;
      return rank(b.paceStatus)-rank(a.paceStatus)||b.remainingMinutes-a.remainingMinutes;
    })[0]??null;
  const configured=String(settings?.default_mode??"normal");
  const defaultMode=(configured==="light"||configured==="recovery"||configured==="intensive"?configured:"normal") as Exclude<PlanningMode,"custom">;

  return (
    <main className="shell">
      <header className="header">
        <div><p className="eyebrow">WS26/27 · Week {Math.max(0,orchestration.currentWeek)}</p><h1>Today</h1></div>
        <Nav />
      </header>

      <section className="hero panel autopilot-hero">
        <div><span className="metric">{plan.usedMinutes}</span><span className="metric-unit"> / {plan.budgetMinutes} min planned</span></div>
        <p>{capacity.mode.replace("_"," ")} mode · {data.queueMinutes} min retention · {plan.deferred.length} item{plan.deferred.length===1?"":"s"} deferred by capacity.</p>
        <div className="hero-actions">{plan.selected[0]
          ? plan.selected[0].href.startsWith("http")
            ? <a className="primary-button" href={plan.selected[0].href} target="_blank" rel="noreferrer">Start next task</a>
            : <Link className="primary-button" href={plan.selected[0].href}>Start next task</Link>
          : <Link className="secondary-button" href="/courses">Review courses</Link>}
        </div>
      </section>

      <DailyPlan plan={plan} />

      {pendingRetake||resultReady ? <section className={"panel exam-result-today "+(pendingRetake?"retake-pending":"result-ready")}>
        <div className="exam-result-today-head">
          <div><p className="eyebrow">P24 · exam outcome</p><h2>{pendingRetake
            ? (pendingRetake.shortName??pendingRetake.displayName)+" · retake decision pending"
            : (resultReady?.shortName??resultReady?.displayName)+" · result ready"}</h2></div>
          <span>{pendingRetake?"decision":"intake"}</span>
        </div>
        <p>{pendingRetake
          ?"Discretionary planning for this course is paused until the retake decision is resolved."
          :"The configured exam has ended and no official outcome is recorded yet."}</p>
        <div className="button-row"><Link className="secondary-button" href="/exam-results">{pendingRetake?"Resolve retake":"Record result"}</Link></div>
      </section> : null}

      {activeExamBoundary ? <section className={"panel exam-day-today phase-"+activeExamBoundary.phase}>
        <div className="exam-day-today-head">
          <div><p className="eyebrow">P23 · exam-day operations</p><h2>{activeExamBoundary.shortName??activeExamBoundary.displayName} · {activeExamBoundary.phase.replaceAll("_"," ")}</h2></div>
          <span>{examOperations.recoveryLevel==="none"?"boundary":examOperations.recoveryLevel+" recovery"}</span>
        </div>
        <p>{activeExamBoundary.phase==="in_progress"
          ?"Exam in progress. Discretionary preparation is frozen until the scheduled end."
          :examOperations.recoveryLevel==="full"
            ?"Immediate post-exam recovery is active; competing exam-strategy work is withheld."
            :examOperations.recoveryLevel==="light"
              ?"Light recovery is active; heavy exam work remains deferred."
              :activeExamBoundary.phase==="post_exam"
                ?"Pre-exam work is obsolete; close the exam to release any remaining weekly envelope."
                :"Final exam window is active."}</p>
        <div className="button-row"><Link className="secondary-button" href="/exam-day">Open exam-day operations</Link></div>
      </section> : null}

      {examCommand.active ? <section className={"panel exam-command-today level-"+examCommand.level}>
        <div className="exam-command-today-head">
          <div><p className="eyebrow">P22 · exam command</p><h2>{examCommand.activeExamCount} active exam{examCommand.activeExamCount===1?"":"s"} · {examCommand.level.replaceAll("_"," ")}</h2></div>
          <span>{examCommand.urgentExamCount} urgent</span>
        </div>
        <p>{topExamCommand
          ? (topExamCommand.shortName??topExamCommand.displayName)+" ranks first · "+topExamCommand.daysToExam+"d · "+topExamCommand.nextActionTitle+"."
          : examCommand.summary}</p>
        {topExamCommand?.conflictReason?<p className="exam-command-warning">{topExamCommand.conflictReason}</p>:null}
        <div className="button-row"><Link className="secondary-button" href="/exam-command">Open exam command center</Link></div>
      </section> : null}

      {weekRuntime ? <section className={"panel week-today "+(weekConcern?"pace-"+weekConcern.paceStatus:"pace-met")}>
        <div className="week-today-head">
          <div><p className="eyebrow">P19 · weekly commitment</p><h2>{weekRuntime.progress.totalCompletedMinutes} / {weekRuntime.progress.totalTargetMinutes} course min</h2></div>
          <span>{weekRuntime.daysRemaining}d left</span>
        </div>
        <div className="bar"><i style={{width:weekRuntime.progress.completionPercent+"%"}}/></div>
        <p>{weekConcern
          ? (weekConcern.shortName??weekConcern.displayName)+" · "+weekConcern.remainingMinutes+" min remaining · "+weekConcern.paceStatus.replace("_"," ")+" pace."
          : "All committed course envelopes are complete."}</p>
        <div className="button-row"><Link className="secondary-button" href="/week">Open weekly plan</Link></div>
      </section> : <section className="panel week-today">
        <div><p className="eyebrow">P19 · weekly commitment</p><h2>No committed week yet</h2></div>
        <p>P18 scenarios are still exploratory until one is committed for the remainder of this week.</p>
        <div className="button-row"><Link className="secondary-button" href="/week">Commit this week</Link></div>
      </section>}

      {topForecast ? <section className={"panel semester-decision forecast-band-"+topForecast.band}>
        <div className="semester-decision-head">
          <div><p className="eyebrow">P17 · semester decision</p><h2>{topForecast.shortName??topForecast.displayName}</h2></div>
          <span>{topForecast.decisionPriority}/100 priority</span>
        </div>
        <p><strong>{topForecast.nextAction.title}</strong> — {topForecast.nextAction.reason}</p>
        <div className="semester-decision-metrics">
          <span><strong>{topForecast.readinessIndex==null?"—":topForecast.readinessIndex+"/100"}</strong> readiness</span>
          <span><strong>{topForecast.confidence.replace("_"," ")}</strong> confidence</span>
          <span><strong>{topForecast.trajectory}</strong> trajectory</span>
          <span><strong>{topForecast.nextAction.expectedValue}/100</strong> action value</span>
        </div>
        <div className="button-row"><Link className="primary-button" href={topForecast.nextAction.href}>Open action</Link><Link className="secondary-button" href="/outlook">View semester outlook</Link></div>
        <small>P17 ranks strategic value; the daily plan above remains the capacity authority.</small>
      </section> : null}

      {topDrift ? <section className={"panel drift-correction drift-"+topDrift.profile.band}>
        <div className="drift-correction-head">
          <div><p className="eyebrow">P14 · automatic plan correction</p><h2>{topDrift.shortName ?? topDrift.displayName}</h2></div>
          <span>{topDrift.profile.band.replace("_"," ")} · {topDrift.profile.score}/100</span>
        </div>
        <p>{topDrift.profile.recommendation}</p>
        <div className="drift-correction-metrics">
          <span><strong>{topDrift.profile.workloadFeedback.replace("_"," ")}</strong> workload signal</span>
          <span><strong>{topDrift.profile.accuracyDelta==null?"—":(topDrift.profile.accuracyDelta>0?"+":"")+topDrift.profile.accuracyDelta+" pp"}</strong> accuracy change</span>
          <span><strong>{topDrift.profile.recentPracticeMinutes} / {topDrift.profile.priorPracticeMinutes} min</strong> recent / prior practice</span>
          <span><strong>+{topDrift.profile.priorityBoost}</strong> allocation priority</span>
        </div>
        <small>StudyOS is reallocating the existing daily capacity only. The {plan.budgetMinutes}-minute budget has not been increased.</small>
      </section> : null}

      {interventionConcern ? <section className={"panel intervention-alert difficulty-"+interventionConcern.analytics.difficultySignal}>
        <div><p className="eyebrow">P15 · intervention validation</p><h2>{interventionConcern.shortName ?? interventionConcern.displayName}</h2></div>
        <p>{interventionConcern.analytics.recommendation}</p>
        <div className="button-row"><Link className="primary-button" href={"/strategy?course="+interventionConcern.courseId}>Change strategy</Link><Link className="secondary-button" href={"/progress#course-"+interventionConcern.courseId}>Review evidence</Link></div>
      </section> : null}

      <CalendarAutopilotPanel data={calendar} />
      <CapacityControls capacity={capacity} defaultMode={defaultMode} />

      <section className="pulse-grid">
        <article className="panel pulse-card">
          <p className="eyebrow">Cumulative checkpoint</p>
          {checkpoint ? <>
            <div className="pulse-title"><h2>{checkpoint.display_name}</h2><span>Week {checkpoint.target_week_no}</span></div>
            <p>{checkpoint.current_week_no < 1
              ? "First rotation begins with " + (checkpoint.short_name ?? checkpoint.display_name) + " when the semester starts."
              : checkpoint.completed
                ? "This week’s rotating cumulative checkpoint is complete."
                : checkpoint.eligible_skills
                  ? checkpoint.eligible_skills + " skills are eligible · up to " + checkpoint.budget_minutes + " minutes."
                  : "No verified questions are available for this checkpoint yet."}</p>
            {checkpoint.due ? <Link className="secondary-button" href="/practice?mode=checkpoint">Open checkpoint</Link> : null}
          </> : <p className="muted">Checkpoint rotation will appear after semester initialization.</p>}
        </article>

        <article className="panel pulse-card">
          <p className="eyebrow">Course risk</p>
          {topRisk ? <>
            <div className="pulse-title"><h2>{topRisk.display_name}</h2><span className={"risk-badge risk-" + topRisk.risk_band}>{topRisk.risk_band.replace("_"," ")}</span></div>
            <div className="risk-score">{Math.round(Number(topRisk.risk_score))}<small>/100</small></div>
            <p>{topRisk.risk_score > 0
              ? "Main pressure: " + (topRiskDrivers(topRisk).map((item)=>item.label).join(" + ") || "early-semester setup") + "."
              : "No risk signal yet; this will become meaningful after real course material and attempts arrive."}</p>
            <Link className="secondary-button" href="/progress">Explain risk</Link>
          </> : <p className="muted">No course-risk data yet.</p>}
        </article>

        <article className="panel pulse-card">
          <p className="eyebrow">Exam transition</p>
          {examCourses.length ? <>
            <h2>{examCourses.length} course{examCourses.length===1?"":"s"} changing mode</h2>
            <div className="mode-list">{examCourses.map((course)=><div key={course.course_id}><strong>{course.short_name ?? course.display_name}</strong><span>{course.operating_mode} · {course.days_to_exam}d</span></div>)}</div>
          </> : <><h2>Semester mode</h2><p>No configured exam is inside the transition window. Current coursework and retention remain dominant.</p></>}
        </article>
      </section>

      <CommitmentsPanel commitments={commitments} courses={courses} />

      <section className="grid today-lower-grid">
        <div className="panel">
          <h2>Review queue</h2>
          <p className="muted">{data.dueSkillCount} skills due · today&apos;s review cap is {data.dailyBudgetMinutes} minutes.</p>
          {data.queue.length ? (
            <ol className="queue">
              {data.queue.map((item) => (
                <li key={item.question.id}>
                  <div><strong>{item.skillTitle}</strong><span>{item.targetDimension} · {Math.ceil(Number(item.question.expected_minutes))} min</span></div>
                  <p>{item.question.prompt}</p>
                </li>
              ))}
            </ol>
          ) : <p className="muted">No due question is available yet. Register course material under Resources to populate the study map.</p>}
        </div>

        <div className="panel">
          <h2>Courses</h2>
          <div className="course-list">
            {data.courses.map((course) => (
              <article key={course.course_id ?? course.stable_key ?? course.display_name}>
                <div><strong>{course.display_name}</strong><span>Week {course.latest_week_no ?? 0}</span></div>
                <div className="bar"><i style={{ width: String(course.durable_mastery_percent ?? 0) + "%" }} /></div>
                <small>{course.coverage_percent ?? 0}% coverage · {course.durable_mastery_percent ?? 0}% durable</small>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
