import Link from "next/link";
import { AcademicPageHeading, AcademicEmptyState } from "@/components/academic-ui";
import { getTodayData, getWeeklyHealth } from "@/lib/study/queries";
import { courseInitials, courseToneClass } from "@/lib/study/course-visual";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const [data, health] = await Promise.all([getTodayData(), getWeeklyHealth()]);
  const byCourse = new Map<string, typeof health>();
  for (const row of health) {
    if (!row.course_id) continue;
    const rows = byCourse.get(row.course_id) ?? [];
    rows.push(row); byCourse.set(row.course_id, rows);
  }

  return (
    <main className="shell">
      <AcademicPageHeading eyebrow="Active semester" title="Courses" detail="Your course binders, teaching weeks, and evidence of learning." />
      <nav className="semester-management-links" aria-label="Manage active course roster">
        <Link href="/semester/bootstrap#semester-roster">Add or verify courses</Link>
        <Link href="/semester">Semester outcome ledger</Link>
        <Link href="/semesters">Archived semesters</Link>
      </nav>
      {!data.courses.length?<AcademicEmptyState title="No courses in this semester" detail="Add your first course from semester setup. StudyOS will keep its work, resources and practice together." action={<Link href="/semester/bootstrap" className="primary-button">Set up courses</Link>}/>:null}
      <section className="course-stack">
        {data.courses.map((c) => {
          const weeks = (c.course_id ? byCourse.get(c.course_id) : undefined) ?? [];
          const latest = weeks.at(-1);
          const placeholder = /^Major Course 0[1-4]$/.test(c.display_name ?? "");
          return (
            <article className={`panel course-detail course-ledger ${courseToneClass(String(c.stable_key ?? c.course_id ?? "course"))}`} key={c.course_id ?? c.stable_key ?? "course"}>
              <div className="course-spine" aria-hidden="true"><span>{courseInitials(c.short_name,c.display_name ?? "Course")}</span></div>
              <div className="course-ledger-body">
              <div className="status-line">
                <div>
                  {c.course_id?<Link className="course-ledger-title" href={"/courses/"+c.course_id}>{c.display_name}</Link>:<strong>{c.display_name}</strong>}
                  <p>{c.course_kind}{placeholder ? " · configuration needed" : ""}</p>
                </div>
                <span>{latest?.health_status ?? "not started"}</span>
              </div>
              <p>{c.total_skills ?? 0} skills · {c.unresolved_errors ?? 0} unresolved errors · {c.unverified_resources ?? 0} resources pending verification</p>
              {weeks.length ? <div className="week-strip">{weeks.map((w) => <span className={`week-chip week-${w.health_status ?? "empty"}`} key={w.teaching_week_id ?? `${c.course_id}-${w.week_no}`}>W{w.week_no} · {w.health_status?.replace("_"," ")}</span>)}</div> : <p className="muted">No teaching week has material yet.</p>}
              {c.course_id ? <div className="button-row"><Link className={placeholder ? "primary-button" : "secondary-button"} href={`/courses/${c.course_id}`}>{placeholder ? "Set up course" : "Open binder →"}</Link></div> : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
