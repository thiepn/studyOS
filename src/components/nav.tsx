"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {getStudyRouteContext} from "@/lib/study/route-context";
export function Nav({courseName,semesterName}:{courseName?:string;semesterName?:string}={}) {
 const context=getStudyRouteContext(usePathname()??"/",courseName);
 return <div className="academic-route-context" aria-label="Current location"><Link href="/">StudyOS</Link>{context.parent?<><span>/</span><Link href={context.parent.href}>{context.parent.label}</Link></>:null}<span>/</span><strong aria-current="location">{context.current}</strong>{semesterName?<span className="academic-semester-context">{semesterName}</span>:null}</div>;
}
