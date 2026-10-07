"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudySyncBridge } from "@/components/study-sync-bridge";

const PRIMARY=[
  {href:"/",label:"Today",match:(path:string)=>path==="/"},
  {href:"/practice",label:"Study",match:(path:string)=>path.startsWith("/practice")},
  {href:"/courses",label:"Courses",match:(path:string)=>path.startsWith("/courses")||path.startsWith("/diagnostics")},
  {href:"/progress",label:"Progress",match:(path:string)=>path==="/progress"||path==="/outlook"||path==="/quality"},
];

const MORE=[
  {group:"Plan",items:[["/week","This week"],["/scenarios","Plan scenarios"],["/handoff","Weekly review"]]},
  {group:"Materials",items:[["/resources","Resources"]]},
  {group:"Exams",items:[["/exam-command","Exam plan"],["/exam-day","Exam day"],["/exam-results","Results"]]},
  {group:"Semester",items:[["/semester","Semester review"],["/semesters","History"],["/semester/bootstrap","Semester setup"]]},
  {group:"System",items:[["/setup","Connections & setup"]]},
] as const;

export function Nav() {
  const path=usePathname();
  const moreActive=MORE.some(group=>group.items.some(([href])=>path===href||path.startsWith(href+"/")));

  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav-primary">
        {PRIMARY.map(item=><Link key={item.href} href={item.href} className={item.match(path)?"active":undefined}>{item.label}</Link>)}
        <details className={"nav-more "+(moreActive?"active":"")}>
          <summary>More</summary>
          <div className="nav-more-menu">
            {MORE.map(group=><div className="nav-more-group" key={group.group}>
              <span>{group.group}</span>
              {group.items.map(([href,label])=><Link key={href} href={href} className={path===href||path.startsWith(href+"/")?"active":undefined}>{label}</Link>)}
            </div>)}
          </div>
        </details>
      </div>
      <StudySyncBridge />
    </nav>
  );
}
