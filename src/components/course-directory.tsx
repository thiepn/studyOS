"use client";
import Link from "next/link";
import {useState,type ReactNode} from "react";
import {WorkspaceIcon} from "@/components/workspace-icon";
export type DirectoryCourse={id:string;name:string;shortName:string|null;weeks:number[];pending:number;latestWeek?:number|null;dueReviews?:number};
export function CourseDirectory({courses,children}:{courses:DirectoryCourse[];children?:ReactNode}){
 const [search,setSearch]=useState("");
 const visible=courses.filter(course=>(course.name+" "+(course.shortName??"")).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 return <section className="course-directory"><div className="directory-toolbar"><label className="directory-search">Find a course<input type="search" placeholder="Search your courses…" value={search} onChange={event=>setSearch(event.target.value)}/></label><div className="button-row directory-actions">{children}</div></div>
 <p className="muted" role="status">{visible.length} course{visible.length===1?"":"s"}</p>
 {visible.map(course=><article key={course.id} className="directory-course"><div className="directory-course-heading"><h2><WorkspaceIcon name="book"/><Link href={"/courses/"+course.id}>{course.name}</Link></h2><Link className="secondary-button" href={"/courses/"+course.id}>Open course</Link></div>
 <div className="directory-course-status"><span>{course.latestWeek?"Latest material · Week "+course.latestWeek:course.weeks.length?course.weeks.length+" teaching week"+(course.weeks.length===1?"":"s"):"Add your first material"}</span>{course.dueReviews?<span className="directory-review-due">{course.dueReviews} review{course.dueReviews===1?"":"s"} due</span>:null}{course.pending?<span>{course.pending} awaiting verification</span>:null}</div>
 <div className="week-strip" aria-label={course.name+" teaching weeks"}>{course.weeks.slice(0,4).map(week=><Link className="week-chip" key={week} href={"/courses/"+course.id+"?tab=weeks#week-"+week}>Week {week}</Link>)}{course.weeks.length>4?<Link href={"/courses/"+course.id+"?tab=weeks"}>All weeks →</Link>:null}</div>
 <div className="directory-course-actions"><Link href={"/courses/"+course.id+"?tab=materials"}>Materials</Link><Link href={"/practice?course="+course.id}>Practice</Link><Link href={"/assistant?course="+course.id}>Ask AI ↗</Link></div></article>)}
 {!visible.length&&courses.length?<p>No courses match. Try a different name.</p>:null}</section>;
}
