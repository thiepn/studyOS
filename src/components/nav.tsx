"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudySyncBridge } from "@/components/study-sync-bridge";
import { isMorePath } from "@/lib/study/more-navigation";

const PRIMARY=[
  {href:"/",label:"Today",match:(path:string)=>path==="/"},
  {href:"/practice",label:"Study",match:(path:string)=>path.startsWith("/practice")},
  {href:"/courses",label:"Courses",match:(path:string)=>path.startsWith("/courses")||path.startsWith("/diagnostics")},
  {href:"/progress",label:"Progress",match:(path:string)=>path==="/progress"||path==="/outlook"||path==="/quality"},
];

export function Nav() {
  const path=usePathname();
  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav-primary">
        {PRIMARY.map(item=><Link key={item.href} href={item.href} aria-current={item.match(path)?"page":undefined} className={item.match(path)?"active":undefined}>{item.label}</Link>)}
        <Link href="/more" aria-current={isMorePath(path)?"page":undefined} className={isMorePath(path)?"active":undefined}>More</Link>
      </div>
      <StudySyncBridge />
    </nav>
  );
}
