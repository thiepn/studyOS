import Link from "next/link";
import { Nav } from "@/components/nav";
import { CourseConfigForm } from "@/components/course-config-form";
import { WeekWorkflowPanel } from "@/components/week-workflow-panel";
import { CourseBinderOverview } from "@/components/course-binder-overview";
import { CourseMasterMap } from "@/components/course-master-map";
import { getCourseWorkflow } from "@/lib/study/workflow";
import { getCourseExamIntelligence } from "@/lib/study/exams";
import { ExamIntelligence } from "@/components/exam-intelligence";
import { courseInitials, courseToneClass } from "@/lib/study/course-visual";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, exam] = await Promise.all([getCourseWorkflow(id), getCourseExamIntelligence(id)]);
  const c = data.configuration;
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

      <nav className="course-section-nav" aria-label="Course sections"><a href="#course-weeks">Weeks & materials</a><Link href={"/resources?course="+c.course_id}>All materials</Link><Link href={"/practice?course="+c.course_id}>Practice</Link><Link href={"/progress#course-"+c.course_id}>Progress</Link></nav>
      <details className="course-summary"><summary>Course overview & weekly progress</summary><CourseBinderOverview courseId={c.course_id} weeks={data.weeks} resources={data.resources}/></details>

      <div className="button-row course-back-row">
        <Link className="secondary-button" href="/courses">← All courses</Link>
        <Link className="primary-button" href={"/practice?course="+c.course_id}>Start practice</Link>
        <Link className="secondary-button" href={"/assistant?course="+c.course_id}>Ask Study Assistant</Link>
        <Link className="secondary-button" href={"/resources?course="+c.course_id+"#manual-registration"}>Add material</Link>
        {c.drive_folder_url ? <a className="secondary-button" href={c.drive_folder_url} target="_blank" rel="noreferrer">Open course Drive</a> : null}
        {c.course_kind === "retake" ? <Link className="secondary-button" href={"/diagnostics/" + c.course_id}>Baseline diagnostic</Link> : null}
      </div>

      <section id="course-weeks" className="workflow-heading">
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

      <details id="course-master-map" className="course-summary"><summary>Topics & learning evidence</summary><CourseMasterMap topics={data.masterMap}/></details>

      <details id="course-exam-intelligence" className="course-summary"><summary>Exam preparation & past papers</summary><ExamIntelligence papers={exam.papers} blueprint={exam.blueprint} strategy={exam.strategy}/></details>

      <details id="course-settings" className="course-settings-drawer">
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
