"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { StudySyncBridge } from "@/components/study-sync-bridge";
import {WorkspaceIcon} from "@/components/workspace-icon";
const destinations=[{href:"/",label:"Today"},{href:"/courses",label:"Courses"},{href:"/practice",label:"Study"},{href:"/assistant",label:"Assistant"},{href:"/progress",label:"Progress"}];
const mobile=[...destinations.slice(0,4),{href:"/more",label:"More"}];
function Pending(){const {pending}=useLinkStatus();return pending?<span className="navigation-pending" role="status" aria-label="Opening page"/>:null;}
export function WorkspaceShell({children}:{children:ReactNode}) {
 const path=usePathname()??"/";
 if(path.startsWith("/login")||path.startsWith("/auth"))return <>{children}</>;
 const current=destinations.find(item=>item.href==="/"?path==="/":path===item.href||path.startsWith(item.href+"/"));
 const mobileCurrent=current?.href==="/progress"?"/more":current?.href??"/more";
 return <div className="workspace-frame"><aside className="workspace-sidebar">
   <Link href="/" className="workspace-brand"><WorkspaceIcon name="book"/><span>StudyOS<small>University workspace</small></span></Link>
   <div className="workspace-nav-group"><p className="workspace-nav-label">Workspace</p><nav aria-label="Primary navigation" className="workspace-destinations workspace-desktop-nav">{destinations.map(item=><Link key={item.href} href={item.href} prefetch={true} aria-current={current?.href===item.href?"page":undefined}><WorkspaceIcon name={item.href==="/"?"today":item.href==="/practice"?"study":item.href==="/courses"?"courses":item.href==="/assistant"?"assistant":"progress"}/><span>{item.label}</span><Pending/></Link>)}</nav></div>
   <div className="workspace-account"><Link href="/more"><WorkspaceIcon name="settings"/>Settings & tools</Link><Link href="/account"><WorkspaceIcon name="account"/>Account</Link><StudySyncBridge/></div>
 </aside><div className="workspace-mobile-heading"><Link href="/">StudyOS</Link><span>{current?.label??"Workspace"}</span></div><div className="workspace-main">{children}</div><nav aria-label="Mobile navigation" className="workspace-destinations workspace-mobile-nav">{mobile.map(item=><Link key={item.href} href={item.href} prefetch={item.href==="/more"?false:true} aria-current={mobileCurrent===item.href?"page":undefined}>{item.label}<Pending/></Link>)}</nav></div>;
}
