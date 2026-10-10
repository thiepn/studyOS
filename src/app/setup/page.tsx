import Link from "next/link";
import { Nav } from "@/components/nav";
import { getActivationData } from "@/lib/study/activation";
import { getStudyWorkspaceState } from "@/lib/study/bootstrap";
import { redirect } from "next/navigation";

export const dynamic="force-dynamic";

function Gate({title,percent,ready,blockers}:{title:string;percent:number;ready:boolean;blockers:string[]}){
  return <article className={"panel activation-gate "+(ready?"ready":"blocked")}>
    <div className="activation-gate-head"><div><p className="eyebrow">{ready?"Certified":"Incomplete"}</p><h2>{title}</h2></div><strong>{percent}%</strong></div>
    <div className="bar"><i style={{width:percent+"%"}}/></div>
    {blockers.length?<ul>{blockers.map((item)=><li key={item}>{item}</li>)}</ul>:<p>All requirements for this layer are satisfied.</p>}
  </article>;
}

export default async function SetupPage(){
  const state=await getStudyWorkspaceState();
  if(!state.activeSemester)redirect(state.hasAnySemester?"/semester/rollover":"/semester/bootstrap");
  const data=await getActivationData();const {evaluation,snapshot,courses,server,semester,firstWeekProof}=data;
  const proofByCourse=new Map(firstWeekProof.map(row=>[row.courseId,row]));
  const majorCourses=courses.filter(course=>course.course_kind==="major");
  const startLabel=semester.starts_on
    ?new Date(String(semester.starts_on)+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})
    :"start date not configured";
  return <main className="shell">
    <header className="header"><div><p className="eyebrow">System readiness</p><h1>Setup</h1></div><Nav /></header>

    <section className="panel activation-hero">
      <div><p className="eyebrow">{semester.display_name} · begins {startLabel}</p>
        <h2>{evaluation.firstWeekCertified?"First-week operationally certified":evaluation.preSemesterReady?"Pre-semester activation complete":"Personal activation still required"}</h2>
        <p>Platform readiness, your personal integrations, and real learning evidence are deliberately certified separately. Code passing CI does not make the semester operational.</p>
      </div>
      <div className="activation-hero-stats"><span><strong>{snapshot.course_count}</strong> courses</span><span><strong>{snapshot.majors_with_timetable}/{snapshot.major_course_count}</strong> major timetables</span><span><strong>{snapshot.retake_baselines_completed}/{snapshot.retake_course_count}</strong> retake baselines</span></div>
    </section>

    <section className="panel first-week-proof" aria-labelledby="real-first-use-heading">
      <div className="section-heading"><div><p className="eyebrow">F18 · real-use acceptance</p><h2 id="real-first-use-heading">Prove one complete study session</h2></div><span>Manual acceptance pending</span></div>
      <p>Use your own authorized account and real university material. This checklist is guidance, not a certification or an attestation.</p>
      <ol>
        <li><Link href="/semester/bootstrap">Confirm your actual semester and course roster</Link> (no sample courses).</li>
        <li><Link href="/resources">Connect the intended Study Drive and approve a real Week-1 source</Link>.</li>
        <li><Link href="/practice">Answer a source-linked question independently</Link> and confirm it appears in the review history.</li>
        <li><Link href="/">Sync the selected Study Calendar, review free time and today's next action</Link>.</li>
        <li>Repeat the flow on a second device; independently verify account isolation and offline replay before production acceptance.</li>
      </ol>
      <p className="muted">Only actual source, attempt and integration records determine readiness. No button on this checklist grants release or recovery authorization.</p>
    </section>

    <section className="activation-gates">
      <Gate title="1 · Platform certification" percent={evaluation.platformPercent} ready={evaluation.platformReady} blockers={evaluation.platformBlockers}/>
      <p className="muted"><Link href="/setup/platform">Inspect detailed deployment and OAuth configuration</Link></p>
      <Gate title="2 · Pre-semester activation" percent={evaluation.activationPercent} ready={evaluation.preSemesterReady} blockers={evaluation.activationBlockers}/>
      <Gate title="3 · First-week certification" percent={evaluation.firstWeekPercent} ready={evaluation.firstWeekCertified} blockers={evaluation.firstWeekBlockers}/>
    </section>

    <section className="grid activation-integrations">
      <article className="panel">
        <div className="section-heading"><div><p className="eyebrow">Study Drive</p><h2>{snapshot.drive_connected?"Connected":"Not connected"}</h2></div><span>{snapshot.drive_tree_ready?"tree ready":"tree pending"}</span></div>
        <p>The intended academic Google Drive account must be connected inside StudyOS. ChatGPT&apos;s connected Google account is irrelevant here.</p>
        <div className="button-row"><Link className="primary-button" href="/resources">{snapshot.drive_connected?"Inspect Study Drive":"Connect Study Drive"}</Link></div>
      </article>
      <article className="panel">
        <div className="section-heading"><div><p className="eyebrow">Study Calendar</p><h2>{snapshot.calendar_connected?"Connected":"Not connected"}</h2></div><span>{snapshot.calendar_synced?"synced":"sync pending"}</span></div>
        <p>Connect the Google Calendar account containing the real university timetable, then sync enough events to map every active major course.</p>
        <div className="button-row">{snapshot.calendar_connected?<Link className="primary-button" href="/">Open calendar controls</Link>:<a className="primary-button" href="/api/integrations/google-calendar/start">Connect Study Calendar</a>}</div>
      </article>
    </section>

    <section className="panel activation-courses">
      <div className="section-heading"><div><p className="eyebrow">Real-course onboarding</p><h2>Active course readiness</h2></div><span>{courses.length}</span></div>
      <div className="activation-course-list">{courses.map((course)=>{
        const major=course.course_kind==="major";
        return <article key={course.course_id}>
          <div className="activation-course-title"><div><strong>{course.display_name}</strong><span>{course.short_name??course.stable_key} · {course.course_kind}</span></div><Link href={"/courses/"+course.course_id}>Configure</Link></div>
          {major?<div className="activation-check-grid">
            <span className={course.drive_folder_ready?"ok":""}>Drive folder</span>
            <span className={course.timetable_event_count>0?"ok":""}>Timetable {course.timetable_event_count||"—"}</span>
            <span className={course.week1_verified_resource_count>0?"ok":""}>W1 source {course.week1_verified_resource_count||"—"}</span>
            <span className={course.skill_count>0&&course.question_count>0?"ok":""}>Map {course.skill_count}/{course.question_count}</span>
            <span className={course.attempt_count>0?"ok":""}>Attempt {course.attempt_count||"—"}</span>
          </div>:course.course_kind==="retake"?<div className="retake-activation">
            <div className="activation-check-grid"><span className={course.drive_folder_ready?"ok":""}>Drive folder</span><span className={course.skill_count>0?"ok":""}>Skills {course.skill_count||"—"}</span><span className={course.question_count>0?"ok":""}>Questions {course.question_count||"—"}</span><span className={course.baseline_status==="completed"?"ok":""}>Baseline {course.baseline_classified_count}/{course.baseline_skill_count}</span></div>
            <Link className="secondary-button" href={"/diagnostics/"+course.course_id}>{course.baseline_status==="completed"?"Review baseline":"Run baseline"}</Link>
          </div>:<div className="activation-check-grid">
            <span className={course.drive_folder_ready?"ok":""}>Drive folder</span>
            <span className={course.resource_count>0?"ok":""}>Sources {course.resource_count||"—"}</span>
            <span className={course.skill_count>0&&course.question_count>0?"ok":""}>Map {course.skill_count}/{course.question_count}</span>
            <span className={course.attempt_count>0?"ok":""}>Attempt {course.attempt_count||"—"}</span>
          </div>}
        </article>;
      })}</div>
    </section>

    <section className="panel first-week-proof">
      <div className="section-heading"><div><p className="eyebrow">End-to-end proof</p><h2>First-week operational contract</h2></div><span>{evaluation.firstWeekCertified?"CERTIFIED":"PENDING"}</span></div>
      <p>Every active major course must independently prove the real path below. One successful course does not certify the rest.</p>
      <pre>Week-1 source in Study Drive → verified processing → skill/question map → closed-book attempt → daily planning</pre>
      <p className="muted">A Week-1 source must be approved, a question must be explicitly linked to that lecture or exercise, and an independent answer must be recorded on that precise question. Hints and unrelated older attempts do not satisfy this evidence gate.</p>
      <div className="readiness-stats">
        <span><strong>{firstWeekProof.filter(p=>p.verifiedResources>0).length}/{majorCourses.length}</strong> verified W1 lecture or exercise</span>
        <span><strong>{firstWeekProof.filter(p=>p.sourceLinkedQuestions>0).length}/{majorCourses.length}</strong> source-linked questions</span>
        <span><strong>{firstWeekProof.filter(p=>p.independentAttempts>0).length}/{majorCourses.length}</strong> independent attempts</span>
      </div>
      <div className="study-first-week-roster">
        {majorCourses.map(course=>{
          const proof=proofByCourse.get(course.course_id);
          const ready=Boolean(proof&&proof.verifiedResources>0&&proof.sourceLinkedQuestions>0&&proof.independentAttempts>0);
          return <article key={course.course_id} className="study-first-week-row">
            <div><strong>{course.short_name??course.display_name}</strong><span>{ready?"Week 1 proven":"Week 1 evidence pending"}</span></div>
            <dl><div><dt>Sources</dt><dd>{proof?.verifiedResources??0}</dd></div>
              <div><dt>Linked questions</dt><dd>{proof?.sourceLinkedQuestions??0}</dd></div>
              <div><dt>Independent attempts</dt><dd>{proof?.independentAttempts??0}</dd></div>
            </dl>
            <Link href={proof?.sourceLinkedQuestions? `/practice?mode=week&course=${course.course_id}&week=1`:
              `/resources?course=${course.course_id}&week=1`}>
              {proof?.sourceLinkedQuestions?"Work on Week 1":"Add/verify Week-1 material"}
            </Link>
          </article>;
        })}
        {!majorCourses.length?<p>No major courses have been configured. Add the actual semester roster first; a zero-course semester cannot be marked academically certified.</p>:null}
      </div>
      <div className="button-row"><Link className="secondary-button" href="/semester/bootstrap">Semester setup</Link><Link className="secondary-button" href="/resources">Material intake</Link><Link className="secondary-button" href="/practice">Practice</Link><Link className="secondary-button" href="/">Today</Link></div>
    </section>

    <section className="panel activation-platform-detail">
      <details><summary>Platform details</summary><div className="callback-list"><div><span>Runtime</span><code>{server.deploymentEnv}</code></div><div><span>Origin</span><code>{server.appOrigin}</code></div><div><span>Build</span><code>{server.buildSha?.slice(0,12)??"unversioned"}</code></div><div><span>Drive callback</span><code>{server.googleDriveCallbackUrl}</code></div><div><span>Calendar callback</span><code>{server.googleCalendarCallbackUrl}</code></div></div></details>
    </section>
  </main>;
}
