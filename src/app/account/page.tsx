import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { ConnectionActions } from "@/components/connection-actions";
import { connectionView, connectionNotice } from "@/lib/study/connection-recovery";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

export default async function AccountPage({searchParams}:{
  searchParams: Promise<{error?:string;notice?:string}>;
}) {
  const query=await searchParams;
  const supabase=await createClient();
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)redirect("/login?next=%2Faccount");
  const userId=data.user.id;
  // All three identities are deliberately independent. Reads are scoped to
  // the verified Supabase owner, never to a Google account inferred from email.
  const [driveResult,calendarResult,blocksResult]=await Promise.all([
    supabase.from("study_drive_connections")
      .select("status,google_account_email,google_account_sub,last_scan_at,last_error")
      .eq("user_id",userId).maybeSingle(),
    supabase.from("study_calendar_connections")
      .select("status,google_account_email,google_account_sub,last_sync_at,last_error")
      .eq("user_id",userId).maybeSingle(),
    supabase.from("study_scheduled_blocks").select("id",{head:true,count:"exact"})
      .eq("user_id",userId).eq("status","committed"),
  ]);
  const connectionReadError=Boolean(driveResult.error||calendarResult.error||blocksResult.error);
  const drive=connectionView("drive",driveResult.data);
  const calendar=connectionView("calendar",calendarResult.data);
  const notice=connectionNotice(query.notice);
  const pendingBlocks=blocksResult.count??0;
  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">StudyOS / Settings</p><h1>Account & connections</h1></div>
      <Nav/>
    </header>
    <div className={styles.intro}>
      <p>One THIEPN identity owns your academic work. Study Drive and Study Calendar are independent Google authorizations, and can use other Google accounts.</p>
      <Link href="/setup/platform">Platform diagnostics ↗</Link>
    </div>
    {query.error==="signout_failed"?<p role="alert" className="error">Sign-out failed. Your session remains active; retry from this page.</p>:null}
    {notice?<p role="status" className={styles.notice}>{notice}</p>:null}
    {connectionReadError?<p role="alert" className="error">Connection status cannot be verified right now. Retry this page before changing Google accounts.</p>:null}
    <div className={styles.stack}>
      <section className={styles.identity} aria-labelledby="account-owner">
        <div className={styles.serviceTop}><span className={styles.number}>01 / Identity</span><span className={styles.status}>Verified session</span></div>
        <h2 id="account-owner">THIEPN Account</h2>
        <p className={styles.email}>{data.user.email??"Authenticated account (email unavailable)"}</p>
        <p className={styles.detail}>This verified account owns StudyOS courses, attempts, planning, and study records. Signing out does not remove Drive folders or Google Calendar events.</p>
        <div className="button-row">
          <form action="/auth/signout" method="post"><button type="submit" className="secondary-button button-reset">Sign out of StudyOS</button></form>
        </div>
      </section>
      <div className={styles.services}>
        {[drive,calendar].map((view,index)=>{
          const linked=index===0?driveResult.data:calendarResult.data;
          const hasIdentity=Boolean(linked?.google_account_sub);
          return <section key={view.service} className={styles.service} aria-labelledby={"service-"+view.service}>
            <div className={styles.serviceTop}>
              <span className={styles.number}>{index===0?"02 / Files":"03 / Schedule"}</span>
              <span className={view.state==="connected"?styles.good:view.state==="error"?styles.issue:styles.status}>{view.state==="connected"?"Authorized":view.state==="error"?"Needs attention":"Not connected"}</span>
            </div>
            <h2 id={"service-"+view.service}>{view.label}</h2>
            <p className={styles.email}>{view.accountEmail??"No verified Google account linked"}</p>
            <p className={styles.detail}>{view.detail}</p>
            {view.lastActivity?<p className={styles.activity}>Last {view.service==="drive"?"scan":"sync"}: {new Date(view.lastActivity).toLocaleString("en-GB")}</p>:null}
            {view.service==="calendar"&&pendingBlocks>0?<p className={styles.warning} role="status">{pendingBlocks} committed StudyOS calendar block(s) must be resolved before disconnecting or switching Google Calendar. <Link href="/">Manage scheduled blocks</Link>.</p>:null}
            {connectionReadError?<p className={styles.activity}>Actions unavailable while connection state cannot be verified.</p>:<ConnectionActions service={view.service} connected={hasIdentity}/>}
          </section>;
        })}
      </div>
    </div>
    <p className={styles.footnote}>Account permissions used by the ChatGPT Google Drive and Calendar connectors do not automatically authorize the StudyOS web application. To authorize StudyOS, complete its separate Google consent flow.</p>
  </main>;
}
