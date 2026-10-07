import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { DailyPlan } from "@/components/daily-plan";
import { CapacityControls } from "@/components/capacity-controls";
import { CommitmentsPanel } from "@/components/commitments-panel";
import { CalendarAutopilotPanel } from "@/components/calendar-autopilot-panel";
import { getDailyOrchestration } from "@/lib/study/planning";
import { getCalendarAutopilot } from "@/lib/study/calendar-autopilot";
import type { PlanningMode } from "@/lib/study/planner";
import { getStudyWorkspaceState } from "@/lib/study/bootstrap";

export const dynamic = "force-dynamic";

function dayLabel(date:string){
  return new Date(date+"T12:00:00Z").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
}

export default async function TodayPage() {
  const workspace=await getStudyWorkspaceState();
  if(!workspace.activeSemester)redirect("/semester/bootstrap");
  const orchestration=await getDailyOrchestration();
  const calendar=await getCalendarAutopilot(orchestration);
  const {today:data,pulse,capacity,plan,commitments,courses,settings}=orchestration;

  const topRisk=pulse.risks[0]??null;
  const checkpoint=pulse.checkpoint;
  const examCommand=orchestration.examCommand;
  const examOperations=orchestration.examOperations;
  const pendingRetake=orchestration.examOutcomeState.pendingRetakes[0]??null;
  const resultReady=orchestration.examOutcomeState.ready[0]??null;
  const weekRuntime=orchestration.weekRuntime;
  const topDrift=[...orchestration.drift.courses]
    .filter(course=>["watch","drifting","critical"].includes(course.profile.band))
    .sort((a,b)=>b.profile.score-a.profile.score)[0]??null;
  const structuralConcern=[...orchestration.learningAnalytics.courses]
    .filter(course=>course.analytics.difficultySignal==="structural"||course.analytics.difficultySignal==="persistent")
    .sort((a,b)=>Number(b.analytics.difficultySignal==="structural")-Number(a.analytics.difficultySignal==="structural"))[0]??null;

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
  const attention=structuralConcern
    ? {title:structuralConcern.shortName??structuralConcern.displayName,body:structuralConcern.analytics.recommendation,href:"/strategy?course="+structuralConcern.courseId,label:"Adjust study method"}
    : topDrift
      ? {title:topDrift.shortName??topDrift.displayName,body:topDrift.profile.recommendation,href:"/progress#course-"+topDrift.courseId,label:"See evidence"}
      : topRisk&&Number(topRisk.risk_score)>0
        ? {title:topRisk.short_name??topRisk.display_name,body:"This course currently has the highest study pressure.",href:"/progress#course-"+topRisk.course_id,label:"See why"}
        : null;

  return (
    <main className="shell today-shell">
      <header className="header workflow-header">
        <div className="page-identity">
          <span className="product-mark">StudyOS</span>
          <div><h1>Today</h1><p>{dayLabel(capacity.local_today)} · Week {Math.max(0,orchestration.currentWeek)}</p></div>
        </div>
        <Nav />
      </header>

      <section className="day-status" aria-label="Today at a glance">
        <div><span>Planned</span><strong>{plan.usedMinutes} / {plan.budgetMinutes} min</strong></div>
        <div><span>Mode</span><strong>{capacity.mode.replace("_"," ")}</strong></div>
        <div><span>Review</span><strong>{data.queueMinutes} min due</strong></div>
        <div><span>Week</span><strong>{weekRuntime?weekRuntime.progress.completionPercent+"% complete":"not committed"}</strong></div>
      </section>

      {!orchestration.bootstrapCertified ? <section className="workflow-notice workflow-notice-required">
        <div><span className="notice-label">Setup required</span><strong>Finish the semester setup before StudyOS schedules normal course work.</strong><p>Your real deadlines remain visible; generated discretionary study work stays paused until the curriculum is anchored.</p></div>
        <Link className="primary-button" href="/semester/bootstrap">Finish setup</Link>
      </section> : null}

      {pendingRetake||resultReady ? <section className="workflow-notice">
        <div><span className="notice-label">Exam result</span><strong>{pendingRetake
          ? (pendingRetake.shortName??pendingRetake.displayName)+" needs a retake decision."
          : (resultReady?.shortName??resultReady?.displayName)+" is ready for its official result."}</strong>
        <p>{pendingRetake?"Study planning for this course is paused until you decide what happens next.":"Record the result so the semester state can close correctly."}</p></div>
        <Link className="secondary-button" href="/exam-results">{pendingRetake?"Resolve":"Record result"}</Link>
      </section> : null}

      {activeExamBoundary ? <section className="workflow-notice workflow-notice-exam">
        <div><span className="notice-label">Exam mode</span><strong>{activeExamBoundary.shortName??activeExamBoundary.displayName} · {activeExamBoundary.phase.replaceAll("_"," ")}</strong>
          <p>{activeExamBoundary.phase==="in_progress"
            ?"The exam is in progress. Other preparation for this course is frozen."
            :examOperations.recoveryLevel==="full"
              ?"Post-exam recovery is active; heavy study work is held back."
              :activeExamBoundary.phase==="post_exam"
                ?"Close the finished exam to release the remaining weekly allocation."
                :"The final exam window is active."}</p>
        </div>
        <Link className="secondary-button" href="/exam-day">Open exam view</Link>
      </section> : null}

      <DailyPlan plan={plan}/>

      <section className="after-plan">
        <div className="after-plan-heading"><span className="section-kicker">Keep an eye on</span><h2>Only what can change the plan.</h2></div>
        <div className="signal-list">
          {weekRuntime ? <Link href="/week" className={"signal-row "+(weekConcern?"signal-"+weekConcern.paceStatus:"")}>
            <div><span>This week</span><strong>{weekRuntime.progress.totalCompletedMinutes} / {weekRuntime.progress.totalTargetMinutes} course min</strong></div>
            <p>{weekConcern
              ? (weekConcern.shortName??weekConcern.displayName)+" has "+weekConcern.remainingMinutes+" min left and is "+weekConcern.paceStatus.replace("_"," ")+"."
              :"All committed course time is complete."}</p><b>Open week →</b>
          </Link> : <Link href="/week" className="signal-row"><div><span>This week</span><strong>No weekly plan committed</strong></div><p>Choose a feasible weekly allocation before the week drifts.</p><b>Plan week →</b></Link>}

          {checkpoint?.due ? <Link href="/practice?mode=checkpoint" className="signal-row">
            <div><span>Checkpoint</span><strong>{checkpoint.short_name??checkpoint.display_name}</strong></div>
            <p>{checkpoint.eligible_skills} skills are eligible for this cumulative retrieval check.</p><b>Run checkpoint →</b>
          </Link> : null}

          {examCommand.active ? <Link href="/exam-command" className="signal-row">
            <div><span>Exam runway</span><strong>{examCommand.activeExamCount} active exam{examCommand.activeExamCount===1?"":"s"}</strong></div>
            <p>{examCommand.urgentExamCount?examCommand.urgentExamCount+" urgent. "+examCommand.summary:examCommand.summary}</p><b>Open exam plan →</b>
          </Link> : null}

          {attention ? <Link href={attention.href} className="signal-row signal-attention">
            <div><span>Needs attention</span><strong>{attention.title}</strong></div><p>{attention.body}</p><b>{attention.label} →</b>
          </Link> : null}
        </div>
      </section>

      <details className="today-drawer">
        <summary><span><strong>Schedule & deadlines</strong><small>Calendar placement, commitments, and due dates</small></span><b>Open</b></summary>
        <div className="today-drawer-body"><CalendarAutopilotPanel data={calendar}/><CommitmentsPanel commitments={commitments} courses={courses}/></div>
      </details>

      <details className="today-drawer">
        <summary><span><strong>Adjust today</strong><small>Change capacity only when the day itself changed</small></span><b>Open</b></summary>
        <div className="today-drawer-body"><CapacityControls capacity={capacity} defaultMode={defaultMode}/></div>
      </details>
    </main>
  );
}
