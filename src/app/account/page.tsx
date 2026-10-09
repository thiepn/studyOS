import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: {searchParams: Promise<{error?: string}>}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login?next=%2Faccount");
  return <main className="shell">
    <header className="header">
      <div><p className="eyebrow">StudyOS / Identity</p><h1>Account</h1></div>
      <Nav/>
    </header>
    <section className="panel" style={{maxWidth:660}}>
      <p className="eyebrow">Active StudyOS session</p>
      <h2>Signed in</h2>
      {params.error === "signout_failed" ? <p role="alert" className="error">Could not sign out of this StudyOS session. Your session is still active; please retry.</p> : null}
      <p>THIEPN Account identity: <strong>{data.user.email ?? "Authenticated account"}</strong></p>
      <p className="muted">Your academic records belong to this signed-in account. Study Drive and Calendar are separate Google authorizations; signing out here does not disconnect those accounts or delete any stored files.</p>
      <div className="button-row">
        <form method="post" action="/auth/signout"><button className="secondary-button button-reset" type="submit">Sign out of StudyOS</button></form>
        <Link className="primary-button" href="/setup/platform">Connection status</Link>
      </div>
    </section>
  </main>;
}
