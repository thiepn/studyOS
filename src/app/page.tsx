import Link from "next/link";
import { Suspense } from "react";
import { cache } from "react";
import { FirstUseWelcome } from "@/components/first-use-welcome";
import { Nav } from "@/components/nav";
import { DailyPlan } from "@/components/daily-plan";
import { ContextDetails } from "@/components/context-details";
import { TodayOverview } from "@/components/today-overview";
import { PlanningCommandOverview } from "@/components/planning-command-overview";
import { buildTodayOverview } from "@/lib/study/today-overview";
import { CapacityControls } from "@/components/capacity-controls";
import { CommitmentsPanel } from "@/components/commitments-panel";
import { CalendarAutopilotPanel } from "@/components/calendar-autopilot-panel";
import { getDailyOrchestration } from "@/lib/study/planning";
import { getCalendarAutopilot } from "@/lib/study/calendar-autopilot";
import type { PlanningMode } from "@/lib/study/planner";
import { getStudyWorkspaceState } from "@/lib/study/bootstrap";
import { createClient } from "@/lib/supabase/server";
import { StudyServiceError } from "@/lib/study/errors";

export const dynamic = "force-dynamic";

function dayLabel(date:string){
  return new Date(date+"T12:00:00Z").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
}

const loadCalendar = cache(getCalendarAutopilot);
async function CalendarDetails({orchestration,overview=false}:{orchestration:Awaited<ReturnType<typeof getDailyOrchestration>>;overview?:boolean}){
 const calendar=await loadCalendar(orchestration);
 return overview?<PlanningCommandOverview commitments={orchestration.commitments} capacity={orchestration.capacity} calendar={calendar} hasWeeklyCommitment={Boolean(orchestration.weekRuntime)} now={new Date()}/>:<CalendarAutopilotPanel data={calendar}/>;
}

export default async function TodayPage() {
  const workspace=await getStudyWorkspaceState();
  if(!workspace.activeSemester)return <FirstUseWelcome/>;
  // First-run users see a short setup journey before the analytics/planning fan-out.
  const supabase=await createClient();
  const {count:activeCourseCount,error:activeCourseCountError}=await supabase
    .from("study_courses").select("id",{count:"exact",head:true})
    .eq("semester_id",workspace.activeSemester.id).eq("active",true);
  if(activeCourseCountError)throw new StudyServiceError(
    "Could not inspect the active course roster",
    activeCourseCountError.code||"course_roster_read_failed",
    activeCourseCountError,
  );
  if(!activeCourseCount)return <FirstUseWelcome hasSemester/>;
  const orchestration=await getDailyOrchestration();
  const {today:data,pulse,capacity,plan,commitments,courses,settings}=orchestration;
  const overview=buildTodayOverview(plan,data.queueMinutes,commitments,new Date());

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
      : topRisk&&(topRisk.risk_band==="at_risk"||topRisk.risk_band==="critical")
        ? {title:topRisk.short_name??topRisk.display_name,body:"This course currently has the highest study pressure.",href:"/progress#course-"+topRisk.course_id,label:"See why"}
        : null;

  return (
    <main className="shell today-shell">
      <header className="header workflow-header">
        <div className="page-identity">
          <span className="product-mark">StudyOS</span>
          <div><h1>Today</h1><p>{dayLabel(capacity.local_today)} · Week {Math.max(0,orchestration.currentWeek)}</p></div>
        </div>
        <Nav semesterName={workspace.activeSemester.display_name} />
      </header>

      {!orchestration.bootstrapCertified ? <section className="workflow-notice workflow-notice-required">
        <div><span className="notice-label">Course setup</span><strong>Connect your curriculum to receive study recommendations.</strong><p>Your real deadlines remain visible; generated discretionary study work stays paused until the curriculum is anchored.</p></div>
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

      <div className="today-workspace-grid"><div className="today-workspace-primary"><DailyPlan plan={plan}/></div><aside className="today-workspace-reference" aria-label="Courses and upcoming work">
      <section className="today-courses"><div className="section-heading"><h2>Your courses</h2><Link href="/courses">All courses →</Link></div><div className="today-course-links">{courses.map(course=><Link key={course.id} href={"/courses/"+course.id}><strong>{course.display_name}</strong><span>Weeks & materials →</span></Link>)}</div></section>
      <section className="today-upcoming"><div className="section-heading"><h2>Upcoming deadlines</h2><a href="#today-schedule">Manage schedule</a></div>{commitments.slice().sort((a,b)=>a.due_at.localeCompare(b.due_at)).slice(0,4).map(item=><div className="upcoming-row" key={item.id}><strong>{item.title}</strong><time dateTime={item.due_at}>{new Date(item.due_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</time></div>)}{!commitments.length?<p className="muted">No upcoming deadlines recorded. Add one in your schedule.</p>:null}</section>
      </aside></div><ContextDetails id="today-planning" title="Planning & schedule">
      <details className="today-drawer"><summary>Study overview & planning details</summary><div className="today-drawer-body">      <TodayOverview data={overview} mode={capacity.mode} weekPercent={weekRuntime?.progress.completionPercent??null}/>
      <Suspense fallback={<p role="status">Loading calendar details…</p>}><CalendarDetails orchestration={orchestration} overview/></Suspense>

</div></details>

      <details className="after-plan" id="today-decisions" aria-labelledby="today-decisions-heading">
        <summary id="today-decisions-heading">Advanced study insights & decisions</summary>
        <div className="signal-list">
          {weekRuntime ? (weekConcern&&(weekConcern.paceStatus==="behind"||weekConcern.paceStatus==="not_started") ? <Link href="/week" className={"signal-row signal-"+weekConcern.paceStatus}>
            <div><span>Weekly commitment</span><strong>{weekConcern.shortName??weekConcern.displayName} needs attention</strong></div>
            <p>{weekConcern.remainingMinutes} min left for this course · {weekConcern.paceStatus.replace("_"," ")}.</p><b>Adjust week →</b>
          </Link> : null) : <Link href="/week" className="signal-row"><div><span>This week</span><strong>No weekly plan committed</strong></div><p>Choose a feasible allocation before the week drifts.</p><b>Plan week →</b></Link>}

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
          {weekRuntime&&!((weekConcern&&(weekConcern.paceStatus==="behind"||weekConcern.paceStatus==="not_started"))||checkpoint?.due||examCommand.active||attention) ? <p className="all-clear-line">No exceptional changes to your study plan. Continue in the order above.</p> : null}
        </div>
      </details>

      <details className="today-drawer">
        <summary id="today-schedule"><span><strong>Schedule & deadlines</strong><small>Calendar placement, commitments, and due dates</small></span><b>Open</b></summary>
        <div className="today-drawer-body"><Suspense fallback={<p role="status">Loading calendar…</p>}><CalendarDetails orchestration={orchestration}/></Suspense><CommitmentsPanel commitments={commitments} courses={courses}/></div>
      </details>

      <details className="today-drawer">
        <summary id="today-adjust"><span><strong>Adjust today</strong><small>Change capacity only when the day itself changed</small></span><b>Open</b></summary>
        <div className="today-drawer-body"><CapacityControls capacity={capacity} defaultMode={defaultMode}/></div>
      </details></ContextDetails>
    </main>
  );
}
