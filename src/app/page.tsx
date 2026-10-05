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
