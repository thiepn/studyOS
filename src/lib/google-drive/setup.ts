import { createAdminClient } from "@/lib/supabase/admin";
import { createFolder } from "./client";

const SUBFOLDERS = ["00_COURSE", "01_WEEKS", "90_ALTKLAUSUREN", "91_SCRIPT", "92_REFERENCE", "99_SYSTEM"] as const;
const MAP_KEYS = ["course", "weeks", "exams", "script", "reference", "system"] as const;

export async function createSemesterDriveTree(userId: string, accessToken: string) {
  const admin = createAdminClient();
  const [{ data: semester, error: semesterError }, { data: connection, error: connectionError }] = await Promise.all([
    admin.from("study_semesters").select("id,display_name,drive_root_folder_id,drive_root_folder_url,drive_inbox_folder_id,drive_inbox_folder_url").eq("user_id", userId).eq("stable_key", "ws26_27").single(),
    admin.from("study_drive_connections").select("root_folder_id,root_folder_url,semester_folder_id,semester_folder_url,inbox_folder_id,inbox_folder_url,status").eq("user_id", userId).single(),
  ]);
  if (semesterError || !semester) throw new Error("Study semester must be initialized before Drive setup");
  if (connectionError || !connection || connection.status !== "connected") throw new Error("Google Drive is not connected");
  const { data: courses, error: coursesError } = await admin.from("study_courses").select("id,stable_key,display_name,sort_order,drive_folder_id,drive_folder_url,drive_folder_map").eq("user_id", userId).eq("semester_id", semester.id).eq("active", true).order("sort_order");
  if (coursesError) throw new Error("Could not load study courses");

  if (connection.root_folder_id && connection.semester_folder_id && connection.inbox_folder_id && (courses ?? []).every((c) => c.drive_folder_id)) {
    return { root: { id: connection.root_folder_id, webViewLink: connection.root_folder_url }, semesterFolder: { id: connection.semester_folder_id, webViewLink: connection.semester_folder_url }, inbox: { id: connection.inbox_folder_id, webViewLink: connection.inbox_folder_url }, reused: true };
  }

  const root = connection.root_folder_id ? { id: connection.root_folder_id, webViewLink: connection.root_folder_url ?? undefined } : await createFolder(accessToken, "Semester OS");
  const semesterFolder = connection.semester_folder_id ? { id: connection.semester_folder_id, webViewLink: connection.semester_folder_url ?? undefined } : await createFolder(accessToken, "WS26-27", root.id);
  const inbox = connection.inbox_folder_id ? { id: connection.inbox_folder_id, webViewLink: connection.inbox_folder_url ?? undefined } : await createFolder(accessToken, "00_INBOX", semesterFolder.id);

  await admin.from("study_semesters").update({
    drive_root_folder_id: root.id, drive_root_folder_url: root.webViewLink ?? `https://drive.google.com/drive/folders/${root.id}`,
    drive_inbox_folder_id: inbox.id, drive_inbox_folder_url: inbox.webViewLink ?? `https://drive.google.com/drive/folders/${inbox.id}`,
  }).eq("id", semester.id).eq("user_id", userId);

  for (const course of courses ?? []) {
    if (course.drive_folder_id && course.drive_folder_map && typeof course.drive_folder_map === "object" && !Array.isArray(course.drive_folder_map) && Object.keys(course.drive_folder_map).length >= 6) continue;
    const courseFolder = await createFolder(accessToken, `${String(course.sort_order).padStart(2,"0")}_${course.display_name.replaceAll("/", "-")}`, semesterFolder.id);
    const folderMap: Record<string,string> = {};
    for (let i=0;i<SUBFOLDERS.length;i++) {
      const folder = await createFolder(accessToken, SUBFOLDERS[i], courseFolder.id);
      folderMap[MAP_KEYS[i]] = folder.id;
    }
    await admin.from("study_courses").update({
      drive_folder_id: courseFolder.id,
      drive_folder_url: courseFolder.webViewLink ?? `https://drive.google.com/drive/folders/${courseFolder.id}`,
      drive_folder_map: folderMap,
    }).eq("id", course.id).eq("user_id", userId);
  }

  await admin.from("study_drive_connections").update({
    root_folder_id: root.id,
    root_folder_url: root.webViewLink ?? `https://drive.google.com/drive/folders/${root.id}`,
    semester_folder_id: semesterFolder.id,
    semester_folder_url: semesterFolder.webViewLink ?? `https://drive.google.com/drive/folders/${semesterFolder.id}`,
    inbox_folder_id: inbox.id,
    inbox_folder_url: inbox.webViewLink ?? `https://drive.google.com/drive/folders/${inbox.id}`,
    status: "connected",
    last_error: null,
  }).eq("user_id", userId);

  return { root, semesterFolder, inbox, reused: false };
}
