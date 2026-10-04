import Link from "next/link";
import { Nav } from "@/components/nav";
import { getTodayData } from "@/lib/study/queries";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const data = await getTodayData();
  return (
    <main className="shell">
      <header className="header">
        <div><p className="eyebrow">WS26/27</p><h1>Today</h1></div>
        <Nav />
      </header>

      <section className="hero panel">
        <div><span className="metric">{data.queueMinutes}</span><span className="metric-unit"> min selected</span></div>
        <p>{data.dueSkillCount} skills are due; the queue is capped at {data.dailyBudgetMinutes} minutes.</p>
        <div className="hero-actions"><Link className="primary-button" href="/practice">Start today&apos;s review</Link></div>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Review queue</h2>
          {data.queue.length ? (
            <ol className="queue">
              {data.queue.map((item) => (
                <li key={item.question.id}>
                  <div><strong>{item.skillTitle}</strong><span>{item.targetDimension} · {Math.ceil(Number(item.question.expected_minutes))} min</span></div>
                  <p>{item.question.prompt}</p>
                </li>
              ))}
            </ol>
          ) : <p className="muted">No due question is available yet. Register course material under Resources to populate the study map.</p>}
        </div>

        <div className="panel">
          <h2>Courses</h2>
          <div className="course-list">
            {data.courses.map((course) => (
              <article key={course.course_id ?? course.stable_key ?? course.display_name}>
                <div><strong>{course.display_name}</strong><span>Week {course.latest_week_no ?? 0}</span></div>
                <div className="bar"><i style={{ width: `${course.durable_mastery_percent ?? 0}%` }} /></div>
                <small>{course.coverage_percent ?? 0}% coverage · {course.durable_mastery_percent ?? 0}% durable</small>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
