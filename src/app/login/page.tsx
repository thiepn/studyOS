import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const params = await searchParams;
  const next = safeNext(params.next);
  if (data?.claims?.sub) redirect(next);
  return (
    <main className="login-shell">
      <section className="panel login-panel">
        <p className="eyebrow">THIEPN Account</p>
        <h1>Semester OS</h1>
        <p>Sign in with the same Google-backed THIEPN Account used by your other apps.</p>
        {params.error ? <p className="error">Sign-in could not be completed. Try again.</p> : null}
        <a className="primary-button" href={`/auth/google?next=${encodeURIComponent(next)}`}>Continue with Google</a>
      </section>
    </main>
  );
}
