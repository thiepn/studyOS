"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { StudySyncBridge } from "@/components/study-sync-bridge";
import { isMorePath } from "@/lib/study/more-navigation";
import { getStudyRouteContext } from "@/lib/study/route-context";

const PRIMARY=[
  {href:"/",label:"Today",match:(path:string)=>path==="/"},
  {href:"/practice",label:"Study",match:(path:string)=>path.startsWith("/practice")},
  {href:"/courses",label:"Courses",match:(path:string)=>path.startsWith("/courses")||path.startsWith("/diagnostics")},
  {href:"/progress",label:"Progress",match:(path:string)=>path==="/progress"||path==="/outlook"||path==="/quality"},
  {href:"/more",label:"More",match:isMorePath},
  {href:"/account",label:"Account",match:(path:string)=>path==="/account"||path.startsWith("/account/")},
];

function PrimaryLinks({path,onNavigate}:{path:string;onNavigate?:()=>void}){
  return <>{PRIMARY.map(item=><Link key={item.href} href={item.href}
    aria-current={item.match(path)?"page":undefined}
    className={(item.match(path)?"active ":"")+(item.href==="/account"?"academic-nav__account":"")}
    onClick={onNavigate}>{item.label}</Link>)}</>;
}

export function Nav({courseName,semesterName}:{courseName?:string;semesterName?:string}={}) {
  const path=usePathname()??"/";
  const context=getStudyRouteContext(path,courseName);
  const mobile=useRef<HTMLDetailsElement>(null);
  const toggle=useRef<HTMLElement>(null);
  useEffect(()=>{if(mobile.current)mobile.current.open=false;},[path]);
  function handleMenuKeyDown(event:KeyboardEvent<HTMLDetailsElement>) {
    if(event.key==="Escape"&&mobile.current?.open){
      mobile.current.open=false;
      toggle.current?.focus();
      event.preventDefault();
    } else if(event.key==="ArrowDown"&&event.target===toggle.current) {
      event.preventDefault();
      if(mobile.current)mobile.current.open=true;
      mobile.current?.querySelector<HTMLAnchorElement>(".academic-mobile-links a")?.focus();
    }
  }
  return <div className="studyos-navigation">
    <nav className="nav academic-nav" aria-label="Primary navigation">
      <div className="nav-primary"><PrimaryLinks path={path}/></div>
      <details className="academic-mobile-nav" ref={mobile} onKeyDown={handleMenuKeyDown}>
        <summary ref={toggle} aria-label="Browse StudyOS destinations">
          <span className="academic-mobile-label">Navigate</span>
          <strong>{context.current}</strong><span className="academic-mobile-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="academic-mobile-links"><PrimaryLinks path={path} onNavigate={()=>{if(mobile.current)mobile.current.open=false;}}/></div>
      </details>
      <StudySyncBridge/>
    </nav>
    <div className="academic-route-context" aria-label="Current location">
      <Link href="/">StudyOS</Link>
      {context.parent?<><span aria-hidden="true">/</span><Link href={context.parent.href}>{context.parent.label}</Link></>:null}
      <span aria-hidden="true">/</span>
      <strong aria-current="location">{context.current}</strong>
      {semesterName?<span className="academic-semester-context" title="Active semester, verified by this page">{semesterName}</span>:null}
      <div className="academic-context-actions">
        <Link href="/semester/bootstrap" aria-label="Manage active semester setup">Semester setup</Link>
        <Link href="/semesters" aria-label="Browse active and archived semesters">History</Link>
      </div>
    </div>
  </div>;
}
