import Link from "next/link";
import { Nav } from "@/components/nav";
import { ExamSimulation } from "@/components/exam-simulation";
import { getExamSimulationPage } from "@/lib/study/exams";

export const dynamic="force-dynamic";

export default async function TimedExamPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const data=await getExamSimulationPage(id);
  return <main className="shell practice-shell">
    <header className="header"><div><p className="eyebrow">Exam simulation</p><h1>{data.paper.course_name}</h1></div><Nav /></header>
    <div className="button-row course-back-row"><Link className="secondary-button" href="/practice">← Practice</Link><Link className="secondary-button" href={"/courses/"+data.paper.course_id}>Course blueprint</Link></div>
    <ExamSimulation data={data}/>
  </main>;
}
