import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudyWorkspaceState } from "@/lib/study/bootstrap";
import { AcademicPageHeading, AcademicEmptyState } from "@/components/academic-ui";
import { getCourseSummaries, getWeeklyHealth } from "@/lib/study/queries";
import { CourseDirectory } from "@/components/course-directory";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const state=await getStudyWorkspaceState();
  if(!state.activeSemester)redirect(state.hasAnySemester?"/semester/rollover":"/semester/bootstrap");
  const [courses, health] = await Promise.all([getCourseSummaries(), getWeeklyHealth()]);
  const data = { courses };
  const byCourse = new Map<string, typeof health>();
  for (const row of health) {
    if (!row.course_id) continue;
    const rows = byCourse.get(row.course_id) ?? [];
    rows.push(row); byCourse.set(row.course_id, rows);
  }

  return (
    <main className="shell">
      <AcademicPageHeading eyebrow="Active semester" title="Courses" detail="Open a course to find its teaching weeks, materials and practice." />
      <div className="button-row directory-toolbar"><Link className="secondary-button" href="/semester/bootstrap#semester-roster">Add a course</Link><Link href="/resources">All materials</Link></div>
      {!data.courses.length?<AcademicEmptyState title="No courses in this semester" detail="Add your first course from semester setup. StudyOS will keep its work, resources and practice together." action={<Link href="/semester/bootstrap" className="primary-button">Set up courses</Link>}/>:null}
      <CourseDirectory courses={data.courses.filter(c=>c.course_id).map(c=>({id:c.course_id!,name:c.display_name??"Course",shortName:c.short_name,latestWeek:c.latest_week_no,dueReviews:(byCourse.get(c.course_id!)??[]).reduce((sum,w)=>sum+(w.due_skills??0),0),weeks:(byCourse.get(c.course_id!)??[]).flatMap(w=>w.week_no==null?[]:[w.week_no]),pending:c.unverified_resources??0}))}/>
      <details className="course-summary"><summary>Semester administration & history</summary><div className="button-row"><Link href="/semester">Semester review</Link><Link href="/semesters">Archived semesters</Link></div></details>
    </main>
  );
}
