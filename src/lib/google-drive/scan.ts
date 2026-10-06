import { createAdminClient } from "@/lib/supabase/admin";
import { listChildren, refreshDriveAccessToken, type DriveFile } from "./client";
import { classifyDriveFile, type CourseAlias } from "./classify";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const folderKindByMapKey: Record<string,string> = { course: "course", exams: "exams", script: "script", reference: "reference" };

function weekFromFolderName(name: string) {
  const m = name.match(/(?:^|\b)(?:w|week|woche)\s*0?(\d{1,2})(?:\b|$)/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 40 ? n : undefined;
}

async function recordIntake(admin: ReturnType<typeof createAdminClient>, args: {
  inboxFolderId: string; file: DriveFile; courseStableKey?: string; folderKind?: string; weekNo?: number; courses: CourseAlias[];
}) {
  const classification = classifyDriveFile(args.file.name, args.courses, {
    courseStableKey: args.courseStableKey, folderKind: args.folderKind, weekNo: args.weekNo,
  });
  const status = classification.courseStableKey && classification.resourceType ? "classified" : "discovered";
  const { error } = await (admin.rpc as any)("study_service_upsert_drive_intake", {
    p_semester_inbox_folder_id: args.inboxFolderId,
    p_drive_file_id: args.file.id,
    p_drive_url: args.file.webViewLink ?? `https://drive.google.com/open?id=${args.file.id}`,
    p_title: args.file.name,
    p_mime_type: args.file.mimeType,
    p_parent_folder_id: args.file.parents?.[0] ?? null,
    p_size_bytes: args.file.size ? Number(args.file.size) : null,
    p_drive_created_at: args.file.createdTime ?? null,
    p_drive_modified_at: args.file.modifiedTime ?? null,
    p_course_stable_key: classification.courseStableKey ?? null,
    p_resource_type: classification.resourceType ?? null,
    p_week_no: classification.weekNo ?? null,
    p_confidence: classification.confidence,
    p_status: status,
    p_note: classification.reasons.join("; "),
  });
  if (error) throw new Error(`Could not record Drive intake: ${error.message}`);
  return status;
}

export async function scanDrive(userId: string) {
  const admin = createAdminClient();
  const [{ data: connection, error: connectionError }, { data: semester, error: semesterError }] = await Promise.all([
    admin.from("study_drive_connections").select("inbox_folder_id,status").eq("user_id", userId).single(),
    admin.from("study_semesters").select("id,drive_inbox_folder_id").eq("user_id", userId).eq("active", true).single(),
  ]);
  if (connectionError || !connection || connection.status !== "connected") throw new Error("Google Drive is not connected");
  if (semesterError || !semester?.drive_inbox_folder_id) throw new Error("Semester Drive tree is not set up");
  const inboxFolderId = semester.drive_inbox_folder_id;
  const { data: courseRows, error: coursesError } = await admin.from("study_courses")
    .select("stable_key,display_name,drive_folder_map")
    .eq("user_id", userId).eq("semester_id", semester.id).eq("active", true).order("sort_order");
  if (coursesError) throw new Error(`Could not load courses: ${coursesError.message}`);
  const courses: CourseAlias[] = (courseRows ?? []).map((c) => ({ stableKey: c.stable_key, displayName: c.display_name }));
  const token = await refreshDriveAccessToken(userId);
  let discovered = 0, classified = 0, folders = 0;

  const inboxFiles = await listChildren(token, inboxFolderId);
  for (const file of inboxFiles) {
    if (file.mimeType === FOLDER_MIME) { folders++; continue; }
    const status = await recordIntake(admin, { inboxFolderId, file, courses });
    discovered++; if (status === "classified") classified++;
  }

  for (const course of courseRows ?? []) {
    const map = (course.drive_folder_map ?? {}) as Record<string,string>;
    for (const [mapKey, kind] of Object.entries(folderKindByMapKey)) {
      const folderId = map[mapKey]; if (!folderId) continue;
      for (const file of await listChildren(token, folderId)) {
        if (file.mimeType === FOLDER_MIME) { folders++; continue; }
        const status = await recordIntake(admin, { inboxFolderId, file, courses, courseStableKey: course.stable_key, folderKind: kind });
        discovered++; if (status === "classified") classified++;
      }
    }
    const weeksFolderId = map.weeks;
    if (weeksFolderId) {
      for (const weekFolder of await listChildren(token, weeksFolderId)) {
        if (weekFolder.mimeType !== FOLDER_MIME) continue;
        folders++;
        const weekNo = weekFromFolderName(weekFolder.name);
        for (const file of await listChildren(token, weekFolder.id)) {
          if (file.mimeType === FOLDER_MIME) { folders++; continue; }
          const status = await recordIntake(admin, { inboxFolderId, file, courses, courseStableKey: course.stable_key, weekNo });
          discovered++; if (status === "classified") classified++;
        }
      }
    }
  }

  const note = `${discovered} file(s) seen; ${classified} classified; ${folders} folder(s) traversed`;
  await (admin.rpc as any)("study_service_mark_drive_scan", { p_semester_inbox_folder_id: inboxFolderId, p_status: "ok", p_note: note });
  await admin.from("study_drive_connections").update({ last_scan_at: new Date().toISOString(), last_scan_status: "ok", last_error: null }).eq("user_id", userId);
  return { discovered, classified, folders, note };
}
