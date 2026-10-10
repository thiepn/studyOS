import { StudySystemState } from "@/components/study-system-state";
export default function Loading(){return <main className="shell studyos-system-state" aria-busy="true"><StudySystemState kind="loading" title="Opening workspace…" detail="Your courses and study work are loading."/><div className="loading-section" aria-hidden="true"/></main>;}
