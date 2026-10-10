import Link from "next/link";
import { Nav } from "@/components/nav";
import { CourseConfigForm } from "@/components/course-config-form";
import { WeekWorkflowPanel } from "@/components/week-workflow-panel";
import { CourseBinderOverview } from "@/components/course-binder-overview";
import { CourseMasterMap } from "@/components/course-master-map";
import { getCourseWorkflow } from "@/lib/study/workflow";
import { getCourseExamIntelligence } from "@/lib/study/exams";
import { ExamIntelligence } from "@/components/exam-intelligence";
import { courseToneClass } from "@/lib/study/course-visual";
import { WorkspaceIcon } from "@/components/workspace-icon";
import { CourseTabs } from "@/components/course-tabs";
import { CourseMaterialList } from "@/components/course-material-list";
import { courseBinderOverview, sourceProcessingLabel } from "@/lib/study/course-binder-overview";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams:Promise<{tab?:string}> }) {
  const { id } = await params;
  const query = await searchParams;
  const tab = ["weeks","materials","practice","progress","exams","settings"].includes(query.tab??"")?query.tab!:"overview";
  const data = await getCourseWorkflow(id, {includeMasterMap:tab==="progress"});
  const exam = tab==="exams"?await getCourseExamIntelligence(id):null;
  const c = data.configuration;
  const overview=courseBinderOverview(data.weeks,data.resources);
  const currentFiles=data.resources.filter(file=>file.teaching_week_id===overview.activeWeek?.teaching_week_id&&(!["solution","exam_solution"].includes(file.resource_type)||overview.canOpenSolutions)).slice(0,3);
  return (
    <main className={`shell course-shell ${courseToneClass(c.stable_key)}`}>
      <header className="header course-header">
        <div className="course-header-identity">
          <span className="course-header-document" aria-hidden="true"><WorkspaceIcon name="book"/></span>
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

      <CourseTabs courseId={c.course_id} selected={tab}/>

      <div className="button-row course-back-row">
        <Link className="secondary-button" href="/courses">← All courses</Link>
        <Link className="primary-button" href={"/practice?course="+c.course_id}>Start practice</Link>
        <Link className="secondary-button" href={"/assistant?course="+c.course_id}>Ask Study Assistant</Link>
        <Link className="secondary-button" href={"/resources?course="+c.course_id+"#manual-registration"}>Add material</Link>
        {c.drive_folder_url ? <a className="secondary-button" href={c.drive_folder_url} target="_blank" rel="noreferrer">Open course Drive</a> : null}
        {c.course_kind === "retake" ? <Link className="secondary-button" href={"/diagnostics/" + c.course_id}>Baseline diagnostic</Link> : null}
      </div>

      {tab==="overview"?<div className="course-overview-grid"><section className="course-overview-files"><h2>Current week files</h2>{currentFiles.length?<ul className="course-material-list">{currentFiles.map(file=><li key={file.id}><div><strong>{file.title}</strong><span>{file.resource_type.replaceAll("_"," ")} · {sourceProcessingLabel(file.processing_status)}</span></div>{file.drive_url?<a className="secondary-button" href={file.drive_url} target="_blank" rel="noreferrer">Open file ↗</a>:<span>No file link recorded</span>}</li>)}</ul>:<p className="muted">Add your lecture or exercise sheet to begin this week.</p>}<Link href={`/courses/${id}?tab=materials`}>View all materials →</Link></section><CourseBinderOverview courseId={c.course_id} weeks={data.weeks} resources={data.resources}/></div>:null}

      {tab==="weeks"?<><section id="course-weeks" className="workflow-heading">
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
      </>:null}
      {tab==="materials"?<CourseMaterialList resources={data.resources} weeks={data.weeks}/>:null}
      {tab==="practice"?<section className="panel"><h2>Practice this course</h2><p>Review due questions or choose a teaching week for focused retrieval.</p><Link className="primary-button" href={`/practice?course=${id}`}>Review questions</Link><Link className="secondary-button" href={`/courses/${id}?tab=weeks`}>Choose a week</Link></section>:null}

      {tab==="progress"?<section id="course-master-map"><h2>Topics & learning evidence</h2><CourseMasterMap topics={data.masterMap}/></section>:null}

      {exam?<section id="course-exam-intelligence"><h2>Exam preparation & past papers</h2><ExamIntelligence papers={exam.papers} blueprint={exam.blueprint} strategy={exam.strategy}/></section>:null}
      <div className="course-tools"><Link prefetch={false} href={`/courses/${id}?tab=exams`}>Exam tools</Link><Link prefetch={false} href={`/courses/${id}?tab=settings`}>Course settings</Link></div>

      {tab==="settings"?<details open id="course-settings" className="course-settings-drawer">
        <summary>
          <span><strong>Course settings</strong><small>Identity, exam information, weekly release pattern</small></span>
          <b>{c.short_name ?? c.stable_key}</b>
        </summary>
        <div className="course-settings-body">
          <p className="muted">The stable internal key remains unchanged.</p>
          <CourseConfigForm configuration={c} />
        </div>
      </details>:null}
    </main>
  );
}
