import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeStudyReturnPath } from "@/lib/study/auth-return";
import { AUTH_FAILURES, safeAuthFailure } from "@/lib/study/auth-flow";
import { LoginSubmit } from "@/components/login-submit";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; next?: string; status?: string }>;
}) {
  const params = await searchParams;
  const next = safeStudyReturnPath(params.next);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect(next);

  const failure = safeAuthFailure(params.error);
  const signedOut = params.status === "signed_out";
  return <main className={styles.page}>
    <aside className={styles.brandPanel} aria-label="StudyOS introduction">
      <div className={styles.brand}><span className={styles.mark} aria-hidden="true">S</span> STUDYOS <span aria-hidden="true">/</span> THIEPN</div>
      <div>
        <p className={styles.overline}>A workspace for deliberate study</p>
        <h1 className={styles.lead}>Work with <em>clarity.</em></h1>
        <p className={styles.description}>A single place for your courses, focused practice, retention, deadlines and exam preparation. Progress comes from demonstrated work.</p>
      </div>
      <div className={styles.brandFoot}><span>STUDY / ORGANIZE / RETAIN</span><span>UNIVERSITY STUDY SYSTEM</span></div>
    </aside>
    <section className={styles.contentPanel} aria-labelledby="signin-heading">
      <div className={styles.smallBrand}><span aria-hidden="true">S</span> StudyOS</div>
      <div className={styles.formSection}>
        <p className={styles.kicker}>THIEPN ACCOUNT · STUDYOS</p>
        <h2 id="signin-heading" className={styles.title}>Your study space.</h2>
        <p className={styles.explainer}>Sign in to continue where you left off. Your university materials and study history stay linked to your THIEPN Account.</p>
        {failure ? <div className={styles.notice} role="alert"><strong>Sign-in needs attention.</strong> {AUTH_FAILURES[failure]}</div> : null}
        {!failure && signedOut ? <div className={`${styles.notice} ${styles.success}`} role="status">You have signed out of this StudyOS session.</div> : null}
        {next !== "/" ? <p className={styles.destination}>After sign-in, return to your requested StudyOS page.</p> : null}
        <LoginSubmit next={next}/>
        <p className={styles.meta}><strong>One account for THIEPN.</strong> Google is used to verify your THIEPN identity. Your Study Drive and Calendar may use different Google accounts; those connections are managed separately inside StudyOS.</p>
      </div>
      <div className={styles.bottom}><span>Secure sign-in through THIEPN Account</span><span>No new StudyOS account required</span></div>
    </section>
  </main>;
}
