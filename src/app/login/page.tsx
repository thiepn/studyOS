import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeStudyReturnPath } from "@/lib/study/auth-return";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const params = await searchParams;
  const next = safeStudyReturnPath(params.next);
  if (data?.claims?.sub) redirect(next);
  return (
    <main className="login-shell">
      <section className="panel login-panel">
        <p className="eyebrow">THIEPN Account</p>
        <h1>StudyOS</h1>
        <p>Sign in with the same Google-backed THIEPN Account used by your other apps.</p>
        {params.error ? <p className="error">{params.error==="oauth_origin"?"This deployment is not configured for sign-in. Its canonical APP_ORIGIN and OAuth callback must match the public host.":"Sign-in could not be completed. Try again."}</p> : null}
        <a className="primary-button" href={`/auth/google?next=${encodeURIComponent(next)}`}>Continue with Google</a>
      </section>
    </main>
  );
}
