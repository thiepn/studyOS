import { Nav } from "@/components/nav";
import { getTodayData } from "@/lib/study/queries";
export const dynamic = "force-dynamic";
export default async function ProgressPage(){const data=await getTodayData();return <main className="shell"><header className="header"><div><p className="eyebrow">Evidence</p><h1>Progress</h1></div><Nav /></header><section className="panel course-list">{data.courses.map(c=><article key={c.course_id ?? c.stable_key ?? "course"}><div><strong>{c.display_name}</strong><span>{c.exam_ready_skills ?? 0} exam-ready</span></div><div className="bar"><i style={{width:`${c.durable_mastery_percent ?? 0}%`}}/></div><small>{c.stable_skills ?? 0} stable · {c.fragile_skills ?? 0} fragile · {c.learning_skills ?? 0} learning</small></article>)}</section></main>}
