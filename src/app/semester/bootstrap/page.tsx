import Link from "next/link";
import { Nav } from "@/components/nav";
import {
  BootstrapActionButtons,BootstrapCourseForm,BootstrapPriorForm,InitialSemesterForm,RemovePriorButton,
} from "@/components/semester-bootstrap-controls";
import { getSemesterBootstrapData, getSemesterBootstrapEntryState } from "@/lib/study/semester-bootstrap-data";
import { historicalPriorUse } from "@/lib/study/semester-bootstrap";

export const dynamic="force-dynamic";

function pretty(value:string|null|undefined){return value?value.replaceAll("_"," "):"—";}
function snapshotValue(snapshot:any,key:string){
  const value=snapshot&&typeof snapshot==="object"&&!Array.isArray(snapshot)?snapshot[key]:null;
  return value==null?"—":String(value);
}

export default async function SemesterBootstrapPage(){
  const entry=await getSemesterBootstrapEntryState();

  if(!entry.activeSemester){
    return <main className="shell">
      <header className="header setup-only-header">
        <div><p className="eyebrow">StudyOS · Semester setup</p><h1>{entry.hasAnySemester?"No active semester":"Create your first semester"}</h1></div>
      </header>
      {entry.hasAnySemester ? <section className="panel bootstrap-hero blocked">
        <div className="section-heading"><div><p className="eyebrow">Semester lifecycle</p><h2>Choose the next workspace</h2></div><span>inactive</span></div>
        <p>Semester history exists, but none is active. Use rollover/history recovery instead of creating an unrelated first-semester workspace.</p>
        <div className="button-row"><Link className="primary-button" href="/semester/rollover">Open semester rollover</Link><Link className="secondary-button" href="/semesters">Semester history</Link></div>
      </section> : <section className="panel bootstrap-hero">
        <div className="section-heading"><div><p className="eyebrow">First workspace</p><h2>Start with the real semester</h2></div><span>1 step</span></div>
        <p>Create only the semester identity here. No example courses or old mastery will be inserted. After creation, add the real course roster and curriculum below.</p>
        <InitialSemesterForm/>
      </section>}
    </main>;
  }

  const data=await getSemesterBootstrapData();
  const {evaluation}=data;
  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">Semester setup</p><h1>{data.semester.display_name}</h1></div>
      <Nav />
    </header>

    <section className={"panel bootstrap-hero "+(evaluation.ready?"ready":"blocked")}>
      <div className="section-heading">
        <div><p className="eyebrow">Semester readiness</p><h2>{evaluation.certified?"Setup confirmed":evaluation.ready?"Ready to confirm":"Setup incomplete"}</h2></div>
        <span>{evaluation.percent}%</span>
      </div>
      <div className="bar"><i style={{width:evaluation.percent+"%"}}/></div>
      <p>StudyOS creates a clean semester baseline from current sources. Archived evidence may guide diagnostics, but old mastery, study sessions, weekly debt, and planner state are never restored.</p>
      <div className="bootstrap-summary-grid">
        <span><strong>{evaluation.readyCourses}/{evaluation.courseCount}</strong> courses ready</span>
        <span><strong>{evaluation.driveConnected?"connected":"off"}</strong> Study Drive</span>
        <span><strong>{evaluation.driveTreeReady?"ready":"pending"}</strong> Drive tree</span>
        <span><strong>{data.priors.length}</strong> previous-course links</span>
      </div>
      {evaluation.blockers.length?<ul className="bootstrap-blockers">{evaluation.blockers.map(item=><li key={item}>{item}</li>)}</ul>:null}
      <BootstrapActionButtons ready={evaluation.ready} certified={evaluation.certified} driveConnected={evaluation.driveConnected}/>
    </section>

    <section className="panel bootstrap-intake">
      <div className="section-heading">
        <div><p className="eyebrow">Course roster</p><h2>Add real courses</h2></div>
        <span>{data.courses.length}</span>
      </div>
      <p className="muted">Add only courses that actually belong to this semester. Stable keys become the internal identity used for historical lineage and Drive classification.</p>
      <BootstrapCourseForm/>
    </section>

    <section className="bootstrap-course-grid">
      {evaluation.courses.map(course=><article className={"panel bootstrap-course "+(course.ready?"ready":"blocked")} key={course.courseId}>
        <div className="bootstrap-course-head">
          <div><p className="eyebrow">{pretty(course.courseKind)} · {course.stableKey}</p><h2>{course.displayName}</h2></div>
          <span>{course.ready?"ready":"incomplete"}</span>
        </div>
        <div className="bootstrap-course-checks">
          <span className={course.identityReady?"ok":""}>Identity</span>
          <span className={course.workflowReady?"ok":""}>Workflow</span>
          <span className={course.driveFolderReady?"ok":""}>Drive</span>
          <span className={course.curriculumReady?"ok":""}>Curriculum</span>
          <span className={course.baselineReady?"ok":""}>{course.courseKind==="retake"?"Baseline":"Baseline n/a"}</span>
          <span className={course.historicalPriorCount>0?"ok":""}>Previous links {course.historicalPriorCount||"—"}</span>
        </div>
        <p>{course.verifiedResourceCount} verified source{course.verifiedResourceCount===1?"":"s"} · {course.skillCount} skills · {course.questionCount} questions</p>
        {course.blockers.length?<ul>{course.blockers.map(item=><li key={item}>{item}</li>)}</ul>:<p className="bootstrap-ok">Current curriculum baseline is independently anchored.</p>}
        <div className="button-row">
          <Link className="secondary-button" href={"/courses/"+course.courseId}>Configure</Link>
          <Link className="secondary-button" href="/resources">Curriculum sources</Link>
          {course.courseKind==="retake"?<Link className="secondary-button" href={"/diagnostics/"+course.courseId}>Baseline diagnostic</Link>:null}
        </div>
      </article>)}
      {!evaluation.courses.length?<section className="panel"><p>No active courses exist yet. Add the real semester roster above.</p></section>:null}
    </section>

    <section className="panel bootstrap-priors">
      <div className="section-heading">
        <div><p className="eyebrow">Previous-semester context</p><h2>Use history without restoring mastery</h2></div>
        <span>{data.priors.length}</span>
      </div>
      <p>Attach an archived course only when it genuinely informs this course. The prior changes what StudyOS suggests you diagnose first; it never marks a current skill retained, stable, or exam-ready.</p>
      <BootstrapPriorForm courses={data.courses} options={data.priorOptions}/>
      {data.priors.length?<div className="bootstrap-prior-list">{data.priors.map((prior:any)=>{
        const snapshot=prior.source_snapshot??{};
        return <article key={prior.id}>
          <div className="status-line">
            <strong>{snapshotValue(snapshot,"display_name")} → {data.courses.find(c=>c.courseId===prior.course_id)?.displayName??"Current course"}</strong>
            <span>{pretty(prior.relation)}</span>
          </div>
          <p>{historicalPriorUse(prior.relation)}</p>
          <div className="bootstrap-prior-metrics">
            <span><strong>{snapshotValue(snapshot,"official_attempts")}</strong> official attempts</span>
            <span><strong>{pretty(snapshotValue(snapshot,"latest_outcome"))}</strong> latest outcome</span>
            <span><strong>{snapshotValue(snapshot,"latest_readiness_index")}</strong> prior readiness</span>
            <span><strong>{snapshotValue(snapshot,"unresolved_findings")}</strong> unresolved findings</span>
          </div>
          {prior.note?<p className="muted">{prior.note}</p>:null}
          <RemovePriorButton priorId={String(prior.id)}/>
        </article>;
      })}</div>:<p className="muted">No optional previous-semester context is attached. Direct carried retakes are attached automatically when a matching archived course exists.</p>}
    </section>

    <section className="panel bootstrap-contract">
      <p className="eyebrow">Certification contract</p>
      <h2>What “semester ready” means</h2>
      <div className="bootstrap-contract-grid">
        <span><strong>Real roster</strong> At least one current-semester course exists.</span>
        <span><strong>Fresh Drive tree</strong> Every active course has a folder in this semester.</span>
        <span><strong>Current curriculum</strong> Every course has verified source material, active skills, and active questions.</span>
        <span><strong>Retake proof</strong> Every retake has a fresh baseline diagnostic.</span>
      </div>
      <p className="muted">Certification unlocks normal discretionary planning. It does not certify first-week execution; The semester still requires real timetable, material, and attempt evidence after the semester begins.</p>
    </section>
  </main>;
}
