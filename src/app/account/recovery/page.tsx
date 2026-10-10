import Link from "next/link";
import {redirect} from "next/navigation";
import {Nav} from "@/components/nav";
import {AccountOfflineRecovery} from "@/components/account-offline-recovery";
import {createClient} from "@/lib/supabase/server";
import {getStudyWorkspaceState} from "@/lib/study/bootstrap";
import {StudyServiceError} from "@/lib/study/errors";

export const dynamic="force-dynamic";

export default async function AccountRecoveryPage(){
  const supabase=await createClient();
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)redirect("/login?next=%2Faccount%2Frecovery");
  const workspace=await getStudyWorkspaceState(supabase);
  if(workspace.userId!==data.user.id)
    throw new StudyServiceError("Workspace owner could not be verified","workspace_owner_mismatch");
  return <main className="shell">
    <header className="header"><div><p className="eyebrow">Account / Recovery</p><h1>Workspace recovery</h1></div>
      <Nav semesterName={workspace.activeSemester?.display_name}/></header>
    <nav className="account-recovery-links" aria-label="Account recovery navigation">
      <Link href="/account">Account & authorizations</Link>
      <Link href={workspace.activeSemester?"/courses":workspace.hasAnySemester?"/semester/rollover":"/semester/bootstrap"}>
        {workspace.activeSemester?"Active courses":workspace.hasAnySemester?"Semester rollover":"Create first semester"}
      </Link>
      <Link href="/semesters">Semester history</Link>
    </nav>
    <section className="account-recovery-context" aria-labelledby="account-recovery-context-heading">
      <p className="section-kicker">Verified THIEPN session</p>
      <h2 id="account-recovery-context-heading">{workspace.activeSemester?.display_name??"No active semester"}</h2>
      <p>This is the workspace associated with the current verified THIEPN Account. Calendar and Drive Google identities are separately authorized and do not change who owns academic records.</p>
      {!workspace.activeSemester?<p role="status">{workspace.hasAnySemester
        ?"A historical semester exists, but none is active. Use controlled rollover recovery."
        :"No semester exists yet. Create one before trying to open a course."}</p>:null}
    </section>
    <AccountOfflineRecovery verifiedOwnerId={workspace.userId}/>
    <section className="account-recovery-next" aria-labelledby="recovery-next-heading">
      <h2 id="recovery-next-heading">If sign-in or course access failed</h2>
      <ol>
        <li>Confirm the intended THIEPN Account on <Link href="/account">Account & connections</Link>; different Google Drive or Calendar emails do not change the academic owner.</li>
        <li>Return to the active semester through <Link href="/semesters">Semester history</Link>. Archived work remains read-only.</li>
        <li>If a course link is unavailable, use <Link href="/courses">the current course roster</Link> instead of trusting an old URL.</li>
        <li>Verify queued work under the same owner and check the eventual study history before treating updates as delivered.</li>
      </ol>
      <p>Screen-reader, cross-account and physical-device acceptance is not implied by this recovery workflow.</p>
    </section>
  </main>;
}
