"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { StudySyncBridge } from "@/components/study-sync-bridge";
const destinations=[{href:"/",label:"Today"},{href:"/courses",label:"Courses"},{href:"/practice",label:"Study"},{href:"/progress",label:"Progress"},{href:"/more",label:"More"}];
export function WorkspaceShell({children}:{children:ReactNode}) {
 const path=usePathname()??"/";
 if(path.startsWith("/login")||path.startsWith("/auth"))return <>{children}</>;
 const current=destinations.find(item=>item.href==="/"?path==="/":path===item.href||path.startsWith(item.href+"/"));
 return <div className="workspace-frame"><aside className="workspace-sidebar">
   <Link href="/" className="workspace-brand">StudyOS<span>Your university workspace</span></Link>
   <nav aria-label="Primary navigation" className="workspace-destinations">{destinations.map(item=><Link key={item.href} href={item.href} aria-current={(current?.href??(path==="/assistant"?"":"/more"))===item.href?"page":undefined}>{item.label}</Link>)}</nav>
   <Link className="workspace-assistant" href="/assistant" aria-current={path==="/assistant"?"page":undefined}>Study Assistant ↗</Link>
   <div className="workspace-account"><StudySyncBridge/><Link href="/account">Account & sync</Link></div>
 </aside><div className="workspace-mobile-heading"><Link href="/">StudyOS</Link><Link href="/assistant">Ask AI ↗</Link></div><div className="workspace-main">{children}</div></div>;
}
