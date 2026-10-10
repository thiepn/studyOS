import Link from "next/link";
import type {WeekActionRow,WeekResource} from "@/lib/study/workflow";
import {courseBinderOverview} from "@/lib/study/course-binder-overview";
import {actionDescription} from "@/lib/study/workflow-state";

export function CourseBinderOverview({courseId,weeks,resources}:{
  courseId:string;weeks:WeekActionRow[];resources:WeekResource[];
}){
  const view=courseBinderOverview(weeks,resources);
  const week=view.activeWeek;
  return <section className="binder-overview" aria-labelledby="binder-overview-heading">
    <div className="binder-overview-head">
      <div><p className="section-kicker">Course binder / current position</p>
        <h2 id="binder-overview-heading">{week?"Teaching week "+week.week_no:"Begin your course binder"}</h2></div>
      <span className="binder-overview-stage">{week?view.completedStages+" / 4 study milestones recorded":"No registered week"}</span>
    </div>
    <div className="binder-overview-main">
      <div className="binder-overview-next">
        <span>Recommended next action</span>
        <strong>{view.action}</strong>
        <p>{week?actionDescription(week.next_action):"Register a real teaching-week source to begin the course workflow."}</p>
        <Link className="primary-button" href={week?"#week-"+week.week_no:"/resources?course="+courseId+"&week=1#manual-registration"}>
          {week?"Open week "+week.week_no+" work":"Add first source"}
        </Link>
      </div>
      <dl className="binder-overview-facts">
        <div><dt>Teaching weeks</dt><dd>{view.totalWeeks}</dd></div>
        <div><dt>Verified week sources</dt><dd>{view.verifiedSources}</dd></div>
        <div><dt>Pending/unverified sources</dt><dd>{view.pendingSources}</dd></div>
        <div><dt>Due skills</dt><dd>{view.dueSkills}</dd></div>
        <div><dt>Open findings</dt><dd>{view.openFindings}</dd></div>
      </dl>
    </div>
    {week&&!view.canOpenSolutions?<p className="binder-overview-guard" role="note">Solution links are hidden in StudyOS until an independent sheet attempt is recorded. Google Drive permissions are separate.</p>:null}
    <p className="binder-overview-provenance">Source verification describes processing status, not independent mastery or question/rubric approval.</p>
    <nav className="binder-overview-links" aria-label="Course workspace sections">
      <a href="#course-weeks">Teaching weeks</a><a href="#course-master-map">Knowledge map</a>
      <a href="#course-exam-intelligence">Exam preparation</a><a href="#course-settings">Course settings</a>
      <Link href={"/resources?course="+courseId+"#processing-queue"}>Source approval queue</Link>
    </nav>
  </section>;
}
