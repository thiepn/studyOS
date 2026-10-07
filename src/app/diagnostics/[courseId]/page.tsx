import { Nav } from "@/components/nav";
import { BaselineDiagnosticPanel } from "@/components/baseline-diagnostic";
import { getBaselineDiagnostic } from "@/lib/study/baseline";

export const dynamic="force-dynamic";

export default async function BaselinePage({params}:{params:Promise<{courseId:string}>}){
  const {courseId}=await params;const data=await getBaselineDiagnostic(courseId);
  return <main className="shell">
    <header className="header"><div><p className="eyebrow">Diagnostic</p><h1>Retake baseline</h1></div><Nav /></header>
    {data.priors.length?<section className="panel baseline-prior-context">
      <p className="eyebrow">Previous-semester context</p><h2>What to re-check first</h2>
      <p>Archived evidence is advisory only. It may prioritize diagnostic coverage, but it does not mark any current-semester skill as retained or mastered.</p>
      <div className="bootstrap-prior-list">{data.priors.map((prior:any)=>{
        const snapshot=prior.source_snapshot&&typeof prior.source_snapshot==="object"&&!Array.isArray(prior.source_snapshot)?prior.source_snapshot:{} as any;
        return <article key={prior.id}><strong>{String(snapshot.display_name??"Archived course")} · {String(prior.relation).replaceAll("_"," ")}</strong><p>{snapshot.latest_outcome?"Latest official outcome: "+String(snapshot.latest_outcome)+". ":""}{snapshot.unresolved_findings!=null?String(snapshot.unresolved_findings)+" unresolved finding(s) at archive.":""}</p></article>;
      })}</div>
    </section>:null}
    <BaselineDiagnosticPanel courseId={courseId} courseName={data.course.display_name} skills={data.skills} status={data.summary?.status??data.diagnostic?.status??"not_started"}/>
  </main>;
}
