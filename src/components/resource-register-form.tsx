"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { StudyResourceType, StudySourceAuthority } from "@/lib/supabase/database.types";

const RESOURCE_TYPES: { value: StudyResourceType; label: string }[] = [
  { value: "lecture", label: "Lecture notes/slides" },
  { value: "exercise", label: "Exercise sheet" },
  { value: "solution", label: "Exercise solution" },
  { value: "script", label: "Lecture script" },
  { value: "exam", label: "Past exam" },
  { value: "exam_solution", label: "Past exam solution" },
  { value: "reference", label: "Book/reference" },
  { value: "supplement", label: "Supplement" },
  { value: "course_info", label: "Course information" },
  { value: "other", label: "Other" },
];
const AUTHORITIES: { value: StudySourceAuthority; label: string }[] = [
  { value: "official_course", label: "Official course material" },
  { value: "official_solution", label: "Official solution" },
  { value: "assigned_reference", label: "Assigned reference" },
  { value: "reference", label: "External reference" },
  { value: "unknown", label: "Unknown" },
];

type CourseOption = { id: string; display_name: string; short_name: string | null; drive_folder_url: string | null };

export function ResourceRegisterForm({ courses, defaultCourseId, defaultWeekNo }: { courses: CourseOption[]; defaultCourseId?: string; defaultWeekNo?: number | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/study/resources/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courseId: fd.get("courseId"), title: fd.get("title"), resourceType: fd.get("resourceType"),
          driveUrl: fd.get("driveUrl"), weekNo: fd.get("weekNo"), sourceAuthority: fd.get("sourceAuthority"),
          originalFilename: fd.get("originalFilename"),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Could not register resource");
      setMessage("Registered. The resource is queued for structured extraction.");
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not register resource");
    } finally { setBusy(false); }
  }

  return (
    <form className="resource-form" onSubmit={submit}>
      <div className="form-grid">
        <label><span>Course</span><select name="courseId" required defaultValue={defaultCourseId ?? ""}><option value="" disabled>Select course</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label>
        <label><span>Type</span><select name="resourceType" defaultValue="lecture">{RESOURCE_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
        <label className="wide"><span>Title</span><input name="title" required maxLength={240} placeholder="Lecture 03 — Metric spaces" /></label>
        <label className="wide"><span>Google Drive file URL</span><input name="driveUrl" required inputMode="url" placeholder="https://drive.google.com/file/d/…" /></label>
        <label><span>Teaching week</span><input name="weekNo" type="number" min="1" max="40" inputMode="numeric" defaultValue={defaultWeekNo ?? undefined} placeholder="1" /></label>
        <label><span>Authority</span><select name="sourceAuthority" defaultValue="official_course">{AUTHORITIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
        <label className="wide"><span>Original filename <em>optional</em></span><input name="originalFilename" placeholder="VL03.pdf" /></label>
      </div>
      <div className="button-row"><button className="primary-button button-reset" disabled={busy} type="submit">{busy ? "Registering…" : "Register resource"}</button></div>
      {message ? <p className="form-message" role="status">{message}</p> : null}
    </form>
  );
}
