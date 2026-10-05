import Link from "next/link";
import { Nav } from "@/components/nav";
import { CourseConfigForm } from "@/components/course-config-form";
import { WeekWorkflowPanel } from "@/components/week-workflow-panel";
import { CourseMasterMap } from "@/components/course-master-map";
import { getCourseWorkflow } from "@/lib/study/workflow";
import { getCourseExamIntelligence } from "@/lib/study/exams";
import { ExamIntelligence } from "@/components/exam-intelligence";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, exam] = await Promise.all([getCourseWorkflow(id), getCourseExamIntelligence(id)]);
  const c = data.configuration;
  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">{c.course_kind} · WS26/27</p>
          <h1>{c.display_name}</h1>
          <p className="muted course-subline">
            {[c.professor, c.credits ? `${c.credits} ECTS` : null, c.exam_at ? `Exam ${new Date(c.exam_at).toLocaleDateString()}` : null].filter(Boolean).join(" · ") || "Course details not configured yet."}
          </p>
        </div>
        <Nav />
      </header>

      <div className="button-row course-back-row">
        <Link className="secondary-button" href="/courses">← All courses</Link>
        {c.drive_folder_url ? <a className="secondary-button" href={c.drive_folder_url} target="_blank" rel="noreferrer">Open course Drive</a> : null}
      </div>

      <section className="panel config-panel">
        <div className="section-heading">
          <div><p className="eyebrow">Configuration</p><h2>Course contract</h2></div>
          <span>{c.short_name ?? c.stable_key}</span>
        </div>
        <p className="muted">Set the real course identity, exam information, and weekly release pattern. The stable internal key remains unchanged.</p>
        <CourseConfigForm configuration={c} />
      </section>

      <CourseMasterMap topics={data.masterMap} />

      <ExamIntelligence papers={exam.papers} blueprint={exam.blueprint} strategy={exam.strategy} />

      <section className="workflow-heading">
        <div><p className="eyebrow">Weekly operating loop</p><h2>What needs to happen next</h2></div>
        <p>Material → retrieval → independent sheet attempt → official-solution reconciliation → repair → maintenance. The cumulative checkpoint rotates across the four major courses from Today.</p>
      </section>

      <WeekWorkflowPanel
        courseId={c.course_id}
        weeks={data.weeks}
        findings={data.findings}
        skills={data.skills}
        resources={data.resources}
      />
    </main>
  );
}
