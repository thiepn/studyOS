"use client";
import Link from "next/link";
import {usePathname,useSearchParams} from "next/navigation";
import {CourseDirectory} from "@/components/course-directory";
import {DailyPlan} from "@/components/daily-plan";
import {SourceIndex} from "@/components/source-index";
import {StudyAssistant} from "@/components/study-assistant";
import {FirstUseWelcome} from "@/components/first-use-welcome";
import {AcademicPageHeading} from "@/components/academic-ui";
import {WeekWorkflowPanel} from "@/components/week-workflow-panel";
import type {WeekActionRow} from "@/lib/study/workflow";
import {ReviewSession} from "@/components/review-session";
import MorePage from "../../../../src/app/more/page";
const id="11111111-1111-4111-8111-111111111111";
const courses=[{id,name:"Differentialgleichungen",shortName:"DGL",weeks:[1,2],pending:1},{id:"22222222-2222-4222-8222-222222222222",name:"Stochastik",shortName:null,weeks:[1],pending:0}];
const resources=[{id:"lecture",course_id:id,teaching_week_id:"week1",title:"Week 1 · Lecture.pdf",resource_type:"lecture",processing_status:"verified",source_authority:"official_course",drive_url:"https://drive.google.com/file/d/synthetic-lecture/view",content_sha256:null,published_at:null},{id:"exercise",course_id:id,teaching_week_id:"week1",title:"Week 1 · Exercise sheet.pdf",resource_type:"exercise",processing_status:"new",source_authority:"official_course",drive_url:"https://drive.google.com/file/d/synthetic-exercise/view",content_sha256:null,published_at:null}];
const week:WeekActionRow={teaching_week_id:"week1",course_id:id,week_no:1,resource_count:3,lecture_count:1,exercise_count:1,solution_count:1,verified_resources:1,pending_resources:1,candidate_runs:0,skill_count:1,new_skills:1,learning_skills:0,fragile_skills:0,stable_skills:0,exam_ready_skills:0,due_skills:1,due_minutes:5,unresolved_errors:0,health_status:"needs_attention",next_action:"retrieve_lecture",open_findings:0,scheduled_repairs:0,lecture_retrieval_due:true,exercise_attempt_due:false,solution_reconcile_due:false,checkpoint_due:false,lecture_retrieval_completed_at:null,exercise_attempt_completed_at:null,solution_reconciled_at:null,checkpoint_completed_at:null};
export default function Preview(){
 const path=usePathname();const query=useSearchParams();
 if(path==="/welcome")return <FirstUseWelcome/>;
 if(path==="/more")return <MorePage/>;
 const title=path==="/"?"Today":path==="/courses"?"Courses":path==="/resources"?"Materials":path==="/assistant"?"Study Assistant":path==="/practice"?"Study":"Course materials";
 return <main className={path==="/practice"?"shell practice-shell":"shell"}><p className="muted tiny">Synthetic UI fixture · no live account or academic records</p><AcademicPageHeading eyebrow="Winter semester 2026" title={title}/>
 {path==="/"?<><DailyPlan plan={{mode:"normal",budgetMinutes:90,usedMinutes:35,remainingMinutes:55,deferred:[],selected:[{id:"first",kind:"workflow",title:"Review Week 1",courseId:id,courseName:courses[0].name,reason:"Continue the lecture retrieval for this teaching week.",href:"/courses/"+id+"#week-1",estimatedMinutes:35,scheduledMinutes:35,priority:1,partial:false}]}}/><h2>Your courses</h2><CourseDirectory courses={courses}/></>:null}
 {path==="/courses"?<CourseDirectory courses={courses}/>:null}
 {path.startsWith("/courses/")?<><div className="button-row"><Link href={"/practice?course="+id}>Start practice</Link><Link href={"/assistant?course="+id}>Ask AI</Link><Link href={"/resources?course="+id}>All materials</Link></div><WeekWorkflowPanel courseId={id} weeks={[week]} findings={[]} skills={[{id:"synthetic-skill",title:"Differentiation",stable_key:"differentiate"}]} resources={[...resources,{id:"solution",teaching_week_id:"week1",resource_type:"solution",title:"Week 1 · Official solution.pdf",drive_url:"https://drive.google.com/file/d/synthetic-solution/view",processing_status:"verified"}]} weekPractice={{1:{availableQuestions:1,assessedSkills:1,withRubric:1,withoutRubric:0,excludedLongQuestions:0}}}/></>:null}
 {path==="/resources"?<SourceIndex resources={resources} courseNames={{[id]:courses[0].name}} weekNumbers={{week1:1}}/>:null}
 {path==="/practice"?<ReviewSession courseId={id} plannedMinutes={10} returnHref={"/courses/"+id} returnLabel="Return to course" queue={[{skillId:"synthetic-skill",courseId:id,skillTitle:"Differentiation",priorityScore:1,targetDimension:"execution",question:{id:"33333333-3333-4333-8333-333333333333",question_type:"problem",evidence_dimension:"execution",prompt:"Find the derivative of \\(x^2\\).",expected_minutes:5,difficulty:1,answer_key_or_rubric:"2x",hint_1:null,hint_2:null}}]}/>:null}
 {path==="/assistant"?<StudyAssistant courses={courses} initialCourseId={query.get("course")??undefined} enabled={query.get("mock")==="true"}/>:null}
 </main>;
}
