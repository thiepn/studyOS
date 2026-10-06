import Link from "next/link";
import { Nav } from "@/components/nav";
import { SemesterRolloverForm } from "@/components/semester-rollover-form";
import { getSemesterRolloverData } from "@/lib/study/semester-rollover-data";

export const dynamic="force-dynamic";

export default async function SemesterRolloverPage(){
  const data=await getSemesterRolloverData();
  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">P26 · semester rollover</p><h1>Archive & start next semester</h1></div>
      <Nav />
    </header>

    {!data.activeSemester||!data.preflight||!data.ledger?<section className="panel rollover-blocked-page">
      <h2>No active semester</h2>
      <p>StudyOS found historical semesters but no active workspace. Review Semester History before recovering or creating the next semester.</p>
      <div className="button-row"><Link className="secondary-button" href="/semesters">Semester history</Link></div>
    </section>:<>
      <section className={"panel rollover-hero "+(data.preflight.eligible?"rollover-ready":"rollover-blocked")}>
        <div className="section-heading">
          <div><p className="eyebrow">Source semester</p><h2>{data.activeSemester.display_name}</h2></div>
          <span>{data.preflight.eligible?"ready":"blocked"}</span>
        </div>
        <div className="rollover-summary-grid">
          <span><strong>{data.preflight.terminalCourses}</strong> terminal outcomes</span>
          <span><strong>{data.preflight.carryCourses.length}</strong> planned retakes</span>
          <span><strong>{data.openCommitments.length}</strong> open commitments</span>
          <span><strong>{data.preflight.staleCalendarBlocks}</strong> future calendar blocks</span>
        </div>
        <p>{data.preflight.eligible
          ?"The academic ledger is ready for rollover. P26 will archive the current semester, create the new active workspace, and carry only explicitly planned retakes."
          :"Resolve every blocker below before StudyOS will archive the semester."}</p>
        {data.preflight.blockers.length?<div className="rollover-blocker-list">{data.preflight.blockers.map(item=><article key={item.code}><strong>{item.count}</strong><span>{item.message}</span></article>)}</div>:null}
      </section>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Transaction boundary</p><h2>What does and does not move</h2></div></div>
        <div className="rollover-boundary-grid">
          <article><strong>Carried</strong><p>Planned retake course identity, credits, future exam date, exam configuration, and reusable workflow settings.</p></article>
          <article><strong>Archived only</strong><p>Exam-result history, sessions, mastery evidence, weekly plans, prior forecasts, interventions, and completed course records.</p></article>
          <article><strong>Never copied</strong><p>Unfinished study-time debt, P19 envelopes, stale P10 candidates, calendar blocks, Drive semester folders, or old intake queues.</p></article>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Create next workspace</p><h2>New semester identity</h2></div></div>
        <SemesterRolloverForm
          sourceSemesterId={String(data.activeSemester.id)}
          sourceSemesterName={String(data.activeSemester.display_name)}
          defaultTimezone={String(data.activeSemester.timezone)}
          eligible={data.preflight.eligible}
          blockers={data.preflight.blockers}
          carryCourses={data.preflight.carryCourses}
          staleCalendarBlocks={data.preflight.staleCalendarBlocks}
        />
      </section>
    </>}
  </main>;
}
