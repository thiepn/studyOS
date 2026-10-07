import Link from "next/link";
import { Nav } from "@/components/nav";
import { ArchiveCalendarCleanup } from "@/components/archive-calendar-cleanup";
import { getSemesterRolloverData } from "@/lib/study/semester-rollover-data";

export const dynamic="force-dynamic";

function date(value:string|null){
  return value?new Date(value).toLocaleDateString("en-GB"):"—";
}

export default async function SemestersPage(){
  const data=await getSemesterRolloverData();
  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">Semester lifecycle</p><h1>Semester history</h1></div>
      <Nav />
    </header>

    {data.activeSemester?<section className="panel semester-history-active">
      <div className="section-heading">
        <div><p className="eyebrow">Active workspace</p><h2>{data.activeSemester.display_name}</h2></div>
        <span>active</span>
      </div>
      <p>{date(data.activeSemester.starts_on)} → {date(data.activeSemester.ends_on)}</p>
      <div className="button-row"><Link className="primary-button" href="/semester">Open semester</Link><Link className="secondary-button" href="/semester/rollover">Rollover</Link></div>
    </section>:<section className="panel rollover-warning"><h2>No active semester</h2><p>Historical data is preserved, but StudyOS currently has no active planning workspace.</p></section>}

    <section className="semester-history-list">
      {data.archives.length?data.archives.map(semester=><article className="panel semester-history-row" key={semester.id}>
        <div className="semester-history-head">
          <div><p className="eyebrow">Archived {date(semester.archived_at)}</p><h2>{semester.display_name}</h2></div>
          <span>read only</span>
        </div>
        <p>{date(semester.starts_on)} → {date(semester.ends_on)}</p>
        <div className="button-row">
          <Link className="secondary-button" href={"/semester/archive/"+semester.id}>Open archived ledger</Link>
        </div>
        <ArchiveCalendarCleanup semesterId={String(semester.id)} count={Number(semester.futureBlockCount??0)}/>
      </article>):<section className="panel"><p>No archived semesters yet.</p></section>}
    </section>
  </main>;
}
