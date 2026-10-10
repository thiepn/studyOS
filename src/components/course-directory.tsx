"use client";
import Link from "next/link";
import {useState} from "react";
export type DirectoryCourse={id:string;name:string;shortName:string|null;weeks:number[];pending:number};
export function CourseDirectory({courses}:{courses:DirectoryCourse[]}){
 const [search,setSearch]=useState("");
 const visible=courses.filter(course=>(course.name+" "+(course.shortName??"")).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 return <section className="course-directory"><label className="directory-search">Find a course<input type="search" placeholder="Course name…" value={search} onChange={event=>setSearch(event.target.value)}/></label>
 <p className="muted" role="status">{visible.length} course{visible.length===1?"":"s"}</p>
 {visible.map(course=><article key={course.id} className="directory-course"><div className="directory-course-heading"><h2><Link href={"/courses/"+course.id}>{course.name}</Link></h2><Link className="primary-button" href={"/courses/"+course.id}>Open course</Link></div>
 <p className="muted">{course.weeks.length?course.weeks.length+" teaching weeks":"Add your first lecture or exercise sheet"}{course.pending?" · "+course.pending+" materials awaiting verification":""}</p>
 <div className="week-strip" aria-label={course.name+" teaching weeks"}>{course.weeks.map(week=><Link className="week-chip" key={week} href={"/courses/"+course.id+"#week-"+week}>Week {week}</Link>)}</div>
 <div className="directory-course-actions"><Link href={"/resources?course="+course.id}>Materials</Link><Link href={"/practice?course="+course.id}>Practice</Link><Link href={"/assistant?course="+course.id}>Ask AI ↗</Link></div></article>)}
 {!visible.length&&courses.length?<p>No courses match. Try a different name.</p>:null}</section>;
}
