import Link from "next/link";
import { Nav } from "@/components/nav";
import { ExamClosureButton } from "@/components/exam-closure-button";
import { getExamOperationsData } from "@/lib/study/exam-operations-data";

export const dynamic="force-dynamic";

function fmtMinutes(min:number|null){
  if(min==null)return "—";
  const n=Math.max(0,Math.round(min));
  const h=Math.floor(n/60),m=n%60;
  return h?(m?h+"h "+m+"m":h+"h"):m+"m";
}
function fmtTime(iso:string|null,timezone:string){
  if(!iso)return "—";
  return new Date(iso).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:timezone});
}
function phaseLabel(value:string){return value.replaceAll("_"," ");}

export default async function ExamDayPage(){
  const data=await getExamOperationsData();
  const timezone=String(data.capacity.timezone??"Europe/Berlin");
  const operations=data.examOperations;
  const now=Date.parse(data.nowIso);
  const relevant=data.examOperationCourses.filter(course=>{
    if(["final_window","in_progress","recovery_full","recovery_light"].includes(course.phase))return true;
    if(course.phase!=="post_exam")return false;
    const recent=course.examEndsAt?now-Date.parse(course.examEndsAt)<=7*86_400_000:false;
    return !course.closureComplete||recent;
  });
  const upcoming=data.examOperationCourses.filter(course=>course.phase==="upcoming").slice(0,4);
  const lead=relevant.find(course=>["in_progress","recovery_full","recovery_light"].includes(course.phase))
    ??relevant.find(course=>course.phase==="final_window")
    ??upcoming[0]
    ??null;
  const nextCommand=data.examCommand.courses[0]??null;

  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">P23 · exam-day operations</p><h1>Exam day</h1></div>
      <Nav />
    </header>

    <section className={"panel exam-day-hero "+(lead?"phase-"+lead.phase:"phase-none")}>
      <div className="section-heading">
        <div><p className="eyebrow">Current boundary state</p><h2>{lead?(lead.shortName??lead.displayName):"No configured exam boundary"}</h2></div>
        <span>{lead?phaseLabel(lead.phase):"inactive"}</span>
      </div>
      {lead?<>
        <div className="exam-day-summary">
          <span><strong>{fmtTime(lead.examStartsAt,timezone)}</strong> exam start</span>
          <span><strong>{fmtTime(lead.examEndsAt,timezone)}</strong> scheduled end</span>
          <span><strong>{lead.durationMinutes??120} min</strong> configured duration</span>
          <span><strong>{operations.recoveryLevel}</strong> recovery shield</span>
        </div>
        <p>{lead.phase==="final_window"
          ?"The final 24-hour runway is active. P22 keeps heavy simulations out of this window while P9 remains the method authority."
          :lead.phase==="in_progress"
            ?"The exam is in progress. P23 freezes discretionary study work for this course and competing exam preparation until the scheduled end."
            :lead.phase==="recovery_full"
              ?"Immediate recovery is active. All competing exam-strategy work is withheld for roughly four hours after the exam."
              :lead.phase==="recovery_light"
                ?"Light recovery is active. Short exam work may return, but heavy work remains blocked until the 12-hour recovery boundary."
                :lead.phase==="post_exam"
                  ?"Pre-exam work for this course is obsolete. Any remaining weekly envelope can be released to the active semester plan."
                  :"The exam is configured but not yet in its final operational window."}</p>
      </>:<p>No active course has a configured exam timestamp. P23 will activate automatically from the course exam configuration.</p>}
    </section>

    {operations.recoveryLevel!=="none"?<section className={"panel exam-recovery recovery-"+operations.recoveryLevel}>
      <div className="section-heading">
        <div><p className="eyebrow">Cross-exam recovery</p><h2>{operations.recoveryLevel==="full"?"Full recovery shield":"Light recovery shield"}</h2></div>
        <span>until {fmtTime(operations.recoveryUntil,timezone)}</span>
      </div>
      <p>{operations.recoveryLevel==="full"
        ?"P10 will not admit competing exam-strategy work during this immediate recovery window. Real commitments remain eligible."
        :"P10 may admit lighter exam work with reduced priority, but P23 continues to block heavy exam actions."}</p>
      {nextCommand?<p className="muted">Next P22 pressure: {nextCommand.shortName??nextCommand.displayName} · {nextCommand.daysToExam}d · {nextCommand.nextActionTitle}.</p>:null}
    </section>:null}

    {relevant.length?<section className="exam-day-course-grid">
      {relevant.map(course=><article className={"panel exam-day-course phase-"+course.phase} key={course.courseId}>
        <div className="exam-day-course-head">
          <div><p className="eyebrow">{phaseLabel(course.phase)}</p><h2>{course.shortName??course.displayName}</h2></div>
          <span>{course.closureComplete?"closed":"active"}</span>
        </div>
        <div className="exam-day-course-metrics">
          <span><strong>{fmtMinutes(course.weeklyTargetMinutes)}</strong> weekly target</span>
          <span><strong>{fmtMinutes(course.weeklyCreditedMinutes)}</strong> credited</span>
          <span><strong>{fmtMinutes(course.weeklyRemainingMinutes)}</strong> releasable remainder</span>
          <span><strong>{course.futureScheduledBlocks.length}</strong> future blocks</span>
        </div>
        <p>Exam: {fmtTime(course.examStartsAt,timezone)} → {fmtTime(course.examEndsAt,timezone)}</p>
        {course.phase==="in_progress"?<p className="exam-day-note">Discretionary workflow, retention, P9 work, checkpoints, and weekly fallback work for this course are frozen.</p>:null}
        {course.closureEligible&&!course.closureComplete?<>
          <p className="exam-day-note"><strong>Closure ready.</strong> The exam has ended. Closing removes obsolete StudyOS calendar blocks and releases unused P19 course minutes.</p>
          <ExamClosureButton courseId={course.courseId}/>
        </>:null}
        {course.closureComplete?<p className="exam-day-complete"><strong>Operationally closed.</strong> No unfinished weekly course envelope or future StudyOS calendar block remains.</p>:null}
      </article>)}
    </section>:null}

    {upcoming.length?<section className="panel">
      <div className="section-heading"><div><p className="eyebrow">Upcoming configured exams</p><h2>Next boundaries</h2></div><span>{upcoming.length}</span></div>
      <div className="exam-upcoming-list">
        {upcoming.map(course=><div key={course.courseId}>
          <strong>{course.shortName??course.displayName}</strong>
          <span>{fmtTime(course.examStartsAt,timezone)}</span>
        </div>)}
      </div>
    </section>:null}

    <section className="panel exam-day-rules">
      <p className="eyebrow">P23 authority</p>
      <h2>Boundary rules</h2>
      <div className="exam-day-rule-grid">
        <span><strong>Exam start</strong> freeze obsolete discretionary work</span>
        <span><strong>Scheduled end</strong> unlock closure/release</span>
        <span><strong>0–4h</strong> full cross-exam recovery</span>
        <span><strong>4–12h</strong> light work only</span>
      </div>
      <p className="muted">Real commitments keep their original deadlines. P23 releases planning envelopes, not obligations.</p>
      <div className="button-row"><Link className="secondary-button" href="/exam-command">Open P22 command center</Link><Link className="secondary-button" href="/week">Open weekly plan</Link></div>
    </section>
  </main>;
}
