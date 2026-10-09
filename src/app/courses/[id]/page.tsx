import Link from "next/link";
import { Nav } from "@/components/nav";
import { CourseConfigForm } from "@/components/course-config-form";
import { WeekWorkflowPanel } from "@/components/week-workflow-panel";
import { CourseMasterMap } from "@/components/course-master-map";
import { getCourseWorkflow } from "@/lib/study/workflow";
import { getCourseExamIntelligence } from "@/lib/study/exams";
import { ExamIntelligence } from "@/components/exam-intelligence";
import { courseInitials, courseToneClass } from "@/lib/study/course-visual";
import { featuredTeachingWeek } from "@/lib/study/week-focus";
import { actionLabel } from "@/lib/study/workflow-state";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, exam] = await Promise.all([getCourseWorkflow(id), getCourseExamIntelligence(id)]);
  const c = data.configuration;
  const nextWeekId=featuredTeachingWeek(data.weeks);
  const nextWeek=data.weeks.find(week=>week.teaching_week_id===nextWeekId)??null;
  const nextHref=nextWeek?`#week-${nextWeek.week_no}`:`/resources?course=${c.course_id}&week=1#manual-registration`;
  return (
    <main className={`shell course-shell ${courseToneClass(c.stable_key)}`}>
      <header className="header course-header">
        <div className="course-header-identity">
          <span className="course-header-mark" aria-hidden="true">{courseInitials(c.short_name,c.display_name)}</span>
          <div>
            <p className="eyebrow">{c.course_kind} · active semester</p>
            <h1>{c.display_name}</h1>
            <p className="muted course-subline">
              {[c.professor, c.credits ? `${c.credits} ECTS` : null, c.exam_at ? `Exam ${new Date(c.exam_at).toLocaleDateString()}` : null].filter(Boolean).join(" · ") || "Course details not configured yet."}
            </p>
          </div>
        </div>
        <Nav courseName={c.display_name} />
      </header>

      <div className="button-row course-back-row">
        <Link className="secondary-button" href="/courses">← All courses</Link>
        <Link className="primary-button" href={nextHref}>{nextWeek?`Continue week ${nextWeek.week_no} · ${actionLabel(nextWeek.next_action)}`:"Add first course material"}</Link>
        <Link className="secondary-button" href={"/practice?course="+c.course_id}>Review due skills</Link>
        <Link className="secondary-button" href={"/resources?course="+c.course_id+"#processing-queue"}>Materials & approval</Link>
        {c.drive_folder_url ? <a className="secondary-button" href={c.drive_folder_url} target="_blank" rel="noreferrer">Open course Drive</a> : null}
        {c.course_kind === "retake" ? <Link className="secondary-button" href={"/diagnostics/" + c.course_id}>Baseline diagnostic</Link> : null}
      </div>

      <section className="workflow-heading">
        <div><p className="eyebrow">Current coursework</p><h2>Teaching weeks</h2></div>
        <p>Continue the first unfinished week. The binder keeps the sources, independent work, solution checking and repair together.</p>
      </section>

      <WeekWorkflowPanel
        courseId={c.course_id}
        weeks={data.weeks}
        findings={data.findings}
        skills={data.skills}
        resources={data.resources}
        weekPractice={data.weekPractice}
      />

      <CourseMasterMap topics={data.masterMap} />

      <ExamIntelligence papers={exam.papers} blueprint={exam.blueprint} strategy={exam.strategy} />

      <details className="course-settings-drawer">
        <summary>
          <span><strong>Course settings</strong><small>Identity, exam information, weekly release pattern</small></span>
          <b>{c.short_name ?? c.stable_key}</b>
        </summary>
        <div className="course-settings-body">
          <p className="muted">The stable internal key remains unchanged.</p>
          <CourseConfigForm configuration={c} />
        </div>
      </details>
    </main>
  );
}
