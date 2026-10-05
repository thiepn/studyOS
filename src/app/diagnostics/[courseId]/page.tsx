import { Nav } from "@/components/nav";
import { BaselineDiagnosticPanel } from "@/components/baseline-diagnostic";
import { getBaselineDiagnostic } from "@/lib/study/baseline";

export const dynamic="force-dynamic";

export default async function BaselinePage({params}:{params:Promise<{courseId:string}>}){
  const {courseId}=await params;const data=await getBaselineDiagnostic(courseId);
  return <main className="shell">
    <header className="header"><div><p className="eyebrow">Diagnostic</p><h1>Retake baseline</h1></div><Nav /></header>
    <BaselineDiagnosticPanel courseId={courseId} courseName={data.course.display_name} skills={data.skills} status={data.summary?.status??data.diagnostic?.status??"not_started"}/>
  </main>;
}
