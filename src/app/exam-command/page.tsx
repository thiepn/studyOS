import Link from "next/link";
import { Nav } from "@/components/nav";
import { getExamCommandCenterData } from "@/lib/study/exam-command-data";

export const dynamic="force-dynamic";

function fmt(min:number){
  const n=Math.max(0,Math.round(min));
  const h=Math.floor(n/60),m=n%60;
  return h?(m?h+"h "+m+"m":h+"h"):m+"m";
}
function addDays(date:string,days:number){
  const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}

export default async function ExamCommandPage(){
  const data=await getExamCommandCenterData();
  const command=data.command;
  const selected=new Set(data.selectedExamCourseIds);

  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">P22 · exam-period command center</p><h1>Exam command</h1></div>
      <Nav />
    </header>

    <section className={"panel exam-command-hero level-"+command.level}>
      <div className="section-heading">
        <div><p className="eyebrow">Multi-exam state</p><h2>{command.level.replaceAll("_"," ")}</h2></div>
        <span>{command.activeExamCount} active exam{command.activeExamCount===1?"":"s"}</span>
      </div>
      <p>{command.summary}</p>
      <div className="exam-command-summary">
        <span><strong>{command.urgentExamCount}</strong> urgent ≤7d</span>
        <span><strong>{command.compressedExamCount}</strong> compressed ≤21d</span>
        <span><strong>{fmt(data.totalDailyBudget)}</strong> P10 today budget</span>
        <span><strong>{fmt(data.reviewReserveToday)}</strong> retention protected</span>
      </div>
      <small>P22 coordinates timing and priority between exams. P9 remains authoritative for each course's current exam action.{data.p23ExamInProgress?" P23 exam-in-progress freeze is active.":data.p23RecoveryLevel!=="none"?" P23 "+data.p23RecoveryLevel+" recovery is constraining Today.":""}</small>
    </section>

    {!command.active?<section className="panel">
      <h2>No active exam runway</h2>
      <p>No P9 course is currently in transition/exam mode with an actionable exam-preparation step. P22 will activate automatically when exam runways compress.</p>
      <div className="button-row"><Link className="secondary-button" href="/outlook">Open semester outlook</Link></div>
    </section>:null}

    {command.active?<section className="exam-command-course-grid">
      {command.courses.map(course=><article className={"panel exam-command-course conflict-"+course.conflict} key={course.courseId}>
        <div className="exam-command-course-head">
          <div><p className="eyebrow">rank {course.rank} · {course.daysToExam}d</p><h2>{course.shortName??course.displayName}</h2></div>
          <span>{course.commandScore}/100</span>
        </div>
        <p><strong>{course.nextActionTitle}</strong></p>
        <div className="exam-command-metrics">
          <span><strong>{course.readinessIndex==null?"—":course.readinessIndex+"/100"}</strong> readiness</span>
          <span><strong>{course.band.replaceAll("_"," ")}</strong> readiness band</span>
          <span><strong>{course.trajectory}</strong> trajectory</span>
          <span><strong>{fmt(course.nextActionMinutes)}</strong> P9 action</span>
        </div>
        <p className={course.conflict==="none"?"exam-command-ok":"exam-command-warning"}>
          {course.conflictReason??(course.scheduledDate
            ?"Current P9 action fits the protected runway on "+course.scheduledDate+"."
            :"Current P9 action has no active conflict.")}
        </p>
        <small>Exam date from current P9 runway: {course.daysToExam==null?"—":addDays(data.today,course.daysToExam)} · P10 priority adjustment {course.p10PriorityAdjustment>=0?"+":""}{course.p10PriorityAdjustment}{selected.has(course.courseId)?" · selected in today's P10 plan":""}</small>
        <div className="button-row"><Link className="primary-button" href={course.nextActionHref}>Open P9 action</Link></div>
      </article>)}
    </section>:null}

    {command.active?<section className="panel exam-runway">
      <div className="section-heading">
        <div><p className="eyebrow">Protected 7-day runway</p><h2>Current P9 action placement</h2></div>
        <span>preview only</span>
      </div>
      <p>This is a conflict-resolution preview, not a frozen seven-day strategy. After an action is completed, P9 recalculates and P22 rebuilds the runway.</p>
      <div className="exam-runway-days">
        {command.days.map(day=><article key={day.date}>
          <div><strong>{day.date}</strong><span>{fmt(day.remainingMinutes)} free</span></div>
          <small>{fmt(day.availableMinutes)} exam-usable after protected P10/P11 reserves</small>
          {day.items.length?<ul>{day.items.map(item=><li key={item.courseId}><strong>{command.courses.find(c=>c.courseId===item.courseId)?.shortName??item.courseId}</strong> · {item.title} · {fmt(item.minutes)}{item.heavy?" · heavy":""}</li>)}</ul>:<p>No current P9 action assigned.</p>}
        </article>)}
      </div>
    </section>:null}

    {command.active?<section className="panel exam-command-rules">
      <p className="eyebrow">Coordination guardrails</p>
      <h2>What P22 is protecting</h2>
      <div className="exam-command-rule-grid">
        <span><strong>1 heavy slot/day</strong> Cross-exam fatigue</span>
        <span><strong>≈36h cooldown</strong> Same-course full simulations</span>
        <span><strong>No heavy final 24h</strong> Final-runway protection</span>
        <span><strong>No exam-day prep</strong> Exam itself owns the day</span>
      </div>
      <p className="muted">If a P9 action cannot fit these constraints, P22 exposes the conflict instead of silently replacing the method with something else.</p>
    </section>:null}
  </main>;
}
