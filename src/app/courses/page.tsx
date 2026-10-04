import { Nav } from "@/components/nav";
import { getTodayData, getWeeklyHealth } from "@/lib/study/queries";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const [data, health] = await Promise.all([getTodayData(), getWeeklyHealth()]);
  const byCourse = new Map<string, typeof health>();
  for (const row of health) {
    if (!row.course_id) continue;
    const rows = byCourse.get(row.course_id) ?? []; rows.push(row); byCourse.set(row.course_id, rows);
  }
  return <main className="shell"><header className="header"><div><p className="eyebrow">WS26/27</p><h1>Courses</h1></div><Nav /></header><section className="course-stack">{data.courses.map(c=>{
    const weeks=(c.course_id ? byCourse.get(c.course_id) : undefined) ?? [];
    const current=weeks.at(-1);
    return <article className="panel course-detail" key={c.course_id ?? c.stable_key ?? "course"}><div className="status-line"><div><strong>{c.display_name}</strong><p>{c.course_kind}</p></div><span>{current?.health_status ?? "not started"}</span></div><p>{c.total_skills ?? 0} skills · {c.unresolved_errors ?? 0} unresolved errors · {c.unverified_resources ?? 0} resources pending verification</p>{weeks.length ? <div className="week-strip">{weeks.map(w=><span className={`week-chip week-${w.health_status ?? "empty"}`} key={w.teaching_week_id ?? `${c.course_id}-${w.week_no}`}>W{w.week_no} · {w.health_status?.replace("_"," ")}</span>)}</div> : <p className="muted">No teaching week has material yet.</p>}</article>;
  })}</section></main>;
}
