import Link from "next/link";
import { AcademicPageHeading } from "@/components/academic-ui";
export function FirstUseWelcome({hasSemester=false}:{hasSemester?:boolean}) {
 return <main className="shell today-shell"><AcademicPageHeading eyebrow="Your study workspace" title="Welcome to StudyOS" detail="Keep your courses, materials and daily study together."/>
 <section className="first-use"><span className="section-kicker">Start here</span><h2>{hasSemester?"Add your first course":"Create your semester"}</h2><p>A few course details give your study work a home. You can return to setup whenever you need.</p>
 <Link className="primary-button" href={hasSemester?"/semester/bootstrap#semester-roster":"/semester/bootstrap"}>{hasSemester?"Add a course":"Create semester"}</Link>
 <ol><li>Create a semester</li><li>Add your courses</li><li>Add a lecture or exercise sheet</li><li>Start studying from your course</li></ol></section></main>;
}
