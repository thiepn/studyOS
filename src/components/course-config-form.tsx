"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { CourseConfiguration } from "@/lib/study/workflow";

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function CourseConfigForm({ configuration }: { configuration: CourseConfiguration }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [expectsExercise, setExpectsExercise] = useState(configuration.expects_exercise ?? true);
  const [expectsSolution, setExpectsSolution] = useState(configuration.expects_solution ?? true);
  const examDefault = useMemo(() => localDateTime(configuration.exam_at), [configuration.exam_at]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setBusy(true); setMessage(null);
    try {
      const examValue = String(fd.get("examAt") ?? "").trim();
      const response = await fetch(`/api/study/courses/${configuration.course_id}/configuration`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: fd.get("displayName"),
          shortName: fd.get("shortName"),
          professor: fd.get("professor"),
          credits: fd.get("credits"),
          examAt: examValue ? new Date(examValue).toISOString() : null,
          examDurationMinutes: fd.get("examDurationMinutes"),
          examFormat: fd.get("examFormat"),
          expectedLecturesPerWeek: fd.get("expectedLecturesPerWeek"),
          expectsExercise,
          expectsSolution,
          lectureRetrievalTargetHours: fd.get("lectureRetrievalTargetHours"),
          solutionReconcileTargetHours: fd.get("solutionReconcileTargetHours"),
          checkpointWeight: fd.get("checkpointWeight"),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Could not save course configuration");
      setMessage("Course configuration saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save course configuration");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="course-config-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="wide"><span>Course name</span><input name="displayName" required defaultValue={configuration.display_name} /></label>
        <label><span>Short name</span><input name="shortName" defaultValue={configuration.short_name ?? ""} placeholder="e.g. Ana III" /></label>
        <label><span>Professor</span><input name="professor" defaultValue={configuration.professor ?? ""} /></label>
        <label><span>ECTS</span><input name="credits" type="number" min="0.5" max="60" step="0.5" defaultValue={configuration.credits ?? ""} /></label>
        <label><span>Exam date/time</span><input name="examAt" type="datetime-local" defaultValue={examDefault} /></label>
        <label><span>Exam duration (min)</span><input name="examDurationMinutes" type="number" min="15" max="600" defaultValue={configuration.exam_duration_minutes ?? ""} /></label>
        <label><span>Exam format</span><input name="examFormat" defaultValue={configuration.exam_format ?? ""} placeholder="written, oral, coding…" /></label>
        <label><span>Lectures / week</span><input name="expectedLecturesPerWeek" type="number" min="0" max="7" defaultValue={configuration.expected_lectures_per_week ?? ""} /></label>
        <label><span>Lecture retrieval target (h)</span><input name="lectureRetrievalTargetHours" type="number" min="1" max="168" defaultValue={configuration.lecture_retrieval_target_hours ?? 24} /></label>
        <label><span>Solution reconciliation target (h)</span><input name="solutionReconcileTargetHours" type="number" min="1" max="336" defaultValue={configuration.solution_reconcile_target_hours ?? 48} /></label>
        <label><span>Checkpoint weight</span><input name="checkpointWeight" type="number" min="0.1" max="10" step="0.1" defaultValue={configuration.checkpoint_weight ?? 1} /></label>
      </div>
      <div className="toggle-row">
        <label><input type="checkbox" checked={expectsExercise} onChange={(event) => setExpectsExercise(event.target.checked)} /> Exercise sheet expected</label>
        <label><input type="checkbox" checked={expectsSolution} onChange={(event) => setExpectsSolution(event.target.checked)} /> Official solution expected</label>
      </div>
      <div className="button-row"><button className="primary-button button-reset" type="submit" disabled={busy}>{busy ? "Saving…" : "Save configuration"}</button></div>
      {message ? <p className="form-message" role="status">{message}</p> : null}
    </form>
  );
}
