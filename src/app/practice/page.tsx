import Link from "next/link";
import { Nav } from "@/components/nav";
import { ReviewSession } from "@/components/review-session";
import { getTodayData } from "@/lib/study/queries";
import { getCheckpointData } from "@/lib/study/pulse";
import { getAvailableExamPapers } from "@/lib/study/exams";

export const dynamic = "force-dynamic";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  if(mode==="checkpoint"){
    const data=await getCheckpointData();
    const rotation=data.rotation;
    return (
      <main className="shell practice-shell">
        <header className="header"><div><p className="eyebrow">Cumulative retrieval</p><h1>{rotation?.display_name ?? "Checkpoint"}</h1></div><Nav /></header>
        {rotation?.completed ? <p className="checkpoint-notice">This week&apos;s checkpoint is already complete. Re-running it is optional and will create another checkpoint session.</p> : null}
        <ReviewSession
          queue={data.queue}
          plannedMinutes={Math.max(1,data.queueMinutes)}
          sessionType="checkpoint"
          courseId={rotation?.course_id}
          eyebrow={rotation ? "Week " + rotation.target_week_no + " cumulative checkpoint" : "Cumulative checkpoint"}
          intro="Solve cumulatively and closed-book. Older material is deliberately favored, but weak, lapsed, prerequisite-heavy, and exam-important skills can override age. This session is separate from the 40-minute daily retention cap."
        />
      </main>
    );
  }

  const [data,papers] = await Promise.all([getTodayData(),getAvailableExamPapers()]);
  return (
    <main className="shell practice-shell">
      <header className="header"><div><p className="eyebrow">Retrieval engine</p><h1>Practice</h1></div><Nav /></header>
      {papers.length ? <section className="panel practice-exams">
        <div className="section-heading"><div><p className="eyebrow">Exam simulation</p><h2>Timed Altklausuren</h2></div><span>{papers.length}</span></div>
        <p className="muted">Use real mapped papers for closed-book, full-duration evidence. Verified/official solutions can feed exam mastery; provisional self-grading cannot.</p>
        <div className="practice-exam-list">{papers.map((paper)=><Link className="practice-exam-link" href={"/practice/exam/"+paper.exam_id} key={paper.exam_id}><div><strong>{paper.title}</strong><span>{paper.course.short_name ?? paper.course.display_name} · {paper.year_label ?? "year ?"} · {paper.duration_minutes ?? "?"} min</span></div><b>{paper.total_points ?? paper.question_points} pts</b></Link>)}</div>
      </section> : null}
      <ReviewSession queue={data.queue} plannedMinutes={Math.max(1, data.queueMinutes)} />
    </main>
  );
}
