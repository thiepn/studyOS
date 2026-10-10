import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {AcademicPageHeading} from "@/components/academic-ui";
import {ConnectionActions} from "@/components/connection-actions";
import {connectionView} from "@/lib/study/connection-recovery";
export const dynamic="force-dynamic";
export default async function ConnectionsPage(){
 const db=await createClient();const {data,error}=await db.auth.getUser();if(error||!data.user)redirect("/login?next=%2Faccount%2Fconnections");
 const [drive,calendar]=await Promise.all([db.from("study_drive_connections").select("status,google_account_email,last_scan_at").eq("user_id",data.user.id).maybeSingle(),db.from("study_calendar_connections").select("status,google_account_email,last_sync_at").eq("user_id",data.user.id).maybeSingle()]);
 return <main className="shell"><AcademicPageHeading eyebrow="Settings" title="Connections" detail="Connect the Google services you want to use with StudyOS."/><div className="connections-stack">{([{service:"drive" as const,result:drive,href:"/resources",label:"Open materials"},{service:"calendar" as const,result:calendar,href:"/#today-schedule",label:"Manage schedule"}]).map(({service,result,href,label})=>{const view=connectionView(service,result.data);return <section className="panel" key={service}><div className="section-heading"><h2>{service==="drive"?"Google Drive":"Google Calendar"}</h2><span className="connection-state">{result.error?"Status unavailable":view.state==="connected"?"Connected":"Not connected"}</span></div>{result.error?<p role="alert">Could not load connection status. Refresh to try again.</p>:<><p>{view.detail}</p>{view.accountEmail?<p>{view.accountEmail}</p>:null}{view.lastActivity?<p className="muted">Last activity: {new Date(view.lastActivity).toLocaleString()}</p>:null}<ConnectionActions service={service} connected={view.state==="connected"}/></>}<div className="button-row"><Link href={href}>{label} →</Link></div></section>;})}</div><p className="muted">THIEPN Account sign-in, Drive access, and Calendar access are separate authorizations.</p><Link href="/setup">Advanced setup checks →</Link></main>;
}
