import { Nav } from "@/components/nav";
import { ReviewSession } from "@/components/review-session";
import { getTodayData } from "@/lib/study/queries";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const data = await getTodayData();
  return (
    <main className="shell practice-shell">
      <header className="header">
        <div><p className="eyebrow">Retrieval engine</p><h1>Practice</h1></div>
        <Nav />
      </header>
      <ReviewSession queue={data.queue} plannedMinutes={Math.max(1, data.queueMinutes)} />
    </main>
  );
}
