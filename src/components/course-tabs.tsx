"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
const tabs=["Overview","Weeks","Materials","Practice","Progress"];
export function CourseTabs({courseId,selected}:{courseId:string;selected:string}){
 const router=useRouter();
 useEffect(()=>{const apply=()=>{const hash=window.location.hash;const target=/^#week-/.test(hash)||hash==="#course-weeks"?"weeks":hash==="#course-master-map"?"progress":hash==="#course-exam-intelligence"?"exams":hash==="#course-settings"?"settings":null;if(target&&target!==selected)router.replace(`/courses/${courseId}?tab=${target}${hash}`,{scroll:false});};apply();window.addEventListener("hashchange",apply);return()=>window.removeEventListener("hashchange",apply);},[courseId,selected,router]);
 return <nav className="course-section-nav" aria-label="Course sections">{tabs.map(label=><Link key={label} href={`/courses/${courseId}?tab=${label.toLowerCase()}`} aria-current={selected===label.toLowerCase()?"page":undefined}>{label}</Link>)}</nav>;
}
