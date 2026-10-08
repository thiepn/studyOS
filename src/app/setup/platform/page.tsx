import Link from "next/link";
import {redirect} from "next/navigation";
import {Nav} from "@/components/nav";
import {createClient} from "@/lib/supabase/server";
import {env} from "@/lib/env";
import {evaluatePlatformAdmission} from "@/lib/study/platform-admission";
import {inspectStudyBackendReadiness} from "@/lib/study/backend-preflight";

export const dynamic="force-dynamic";

/** The platform checklist works before the first semester exists.
 * Values of server-side credentials never leave the server. */
export default async function PlatformSetupPage(){
  const db=await createClient();
  const {data,error}=await db.auth.getClaims();
  if(error||!data?.claims?.sub)redirect("/login?next=%2Fsetup%2Fplatform");

  const backend=await inspectStudyBackendReadiness(db as unknown as Parameters<typeof inspectStudyBackendReadiness>[0]);
  const evaluation=evaluatePlatformAdmission({
    deploymentEnv:env.deploymentEnv,
    appOrigin:env.appOrigin,
    publicSupabaseUrl:env.supabaseUrl,
    expectedSupabaseProjectRef:"hycegznamzjhwinegaai",
    hasSupabasePublishableKey:Boolean(env.supabasePublishableKey),
    hasSupabaseSecret:Boolean(env.supabaseSecretKey),
    googleDriveConfigured:Boolean(env.googleDriveClientId&&env.googleDriveClientSecret&&env.driveTokenKey),
    googleCalendarConfigured:Boolean(env.googleCalendarClientId&&env.googleCalendarClientSecret&&env.calendarTokenKey),
    buildSha:env.buildSha??null,
  });

  return <main className="shell study-admission">
    <header className="header workflow-header">
      <div className="page-identity">
        <span className="product-mark">StudyOS</span>
        <div><h1>Platform setup</h1><p>Deployment configuration · independent of semester progress</p></div>
      </div>
      <Nav/>
    </header>

    <section className="study-admission-summary">
      <div><p className="eyebrow">Deployment qualification</p>
        <h2>{evaluation.releaseReady&&backend.healthy?"Configuration and database check complete":"Activation is not yet ready"}</h2>
        <p>These checks inspect configured values, not whether Google consent, THIEPN Account SSO, or a real study attempt works. Do not treat a complete configuration as a successful live acceptance test.</p>
      </div>
      <strong className="study-admission-score">{evaluation.gates.filter(g=>g.ready).length+Number(backend.healthy)}/{evaluation.gates.length+1}</strong>
    </section>

    <ol className="study-admission-list">
      {evaluation.gates.map((gate,index)=><li key={gate.id}>
        <span className="study-admission-number">{String(index+1).padStart(2,"0")}</span>
        <div><strong>{gate.name}</strong><p>{gate.detail}</p></div>
        <span className={"study-admission-state "+(gate.ready?"ready":"pending")}>{gate.ready?"Configured":"Required"}</span>
      </li>)}
      <li>
        <span className="study-admission-number">08</span>
        <div><strong>Live authenticated database contract</strong>
          <p>{backend.message}</p>
          {backend.healthy?<p>Active semester: {backend.semesterInitialized?"present":"not yet created"} · Courses reported: {backend.courseCount}</p>:null}
        </div>
        <span className={"study-admission-state "+(backend.healthy?"ready":"pending")}>{backend.healthy?"Read confirmed":"Unavailable"}</span>
      </li>
    </ol>

    <section className="study-admission-details">
      <h2>External configuration</h2>
      <p>Only configure secrets directly in Vercel. Never paste server keys or Google client secrets into StudyOS, GitHub files, or chat.</p>
      <dl>
        <div><dt>Environment</dt><dd>{env.deploymentEnv}</dd></div>
        <div><dt>Canonical URL</dt><dd><code>{env.appOrigin}</code></dd></div>
        <div><dt>Deployment SHA</dt><dd><code>{env.buildSha??"Unverified"}</code></dd></div>
        <div><dt>Account callback</dt><dd><code>{env.appOrigin}/auth/callback</code></dd></div>
        <div><dt>Drive callback</dt><dd><code>{env.appOrigin}/api/integrations/google-drive/callback</code></dd></div>
        <div><dt>Calendar callback</dt><dd><code>{env.appOrigin}/api/integrations/google-calendar/callback</code></dd></div>
      </dl>
      <p className="muted">The exact callback URLs must be added to their respective Supabase/Google allowlists. Configured client values do not demonstrate that OAuth has been authorized.</p>
      <div className="button-row"><Link className="primary-button" href="/semester/bootstrap">Open semester setup</Link>
        <Link className="secondary-button" href="/setup">Review academic activation</Link></div>
    </section>
  </main>;
}
