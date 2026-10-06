import { createAdminClient } from "@/lib/supabase/admin";
import { encryptRefreshToken } from "./crypto";

export async function saveDriveConnection(input: {
  userId: string;
  googleSub: string;
  email?: string;
  scopes: string[];
  refreshToken: string;
}) {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("study_drive_connections")
    .select("google_account_sub")
    .eq("user_id", input.userId)
    .maybeSingle();
  const switchedAccount = Boolean(existing?.google_account_sub && existing.google_account_sub !== input.googleSub);
  const encrypted = encryptRefreshToken(input.refreshToken);
  const now = new Date().toISOString();

  const { error: credentialError } = await admin.from("study_drive_credentials").upsert({
    user_id: input.userId,
    encrypted_refresh_token: encrypted,
    encryption_version: 1,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (credentialError) throw new Error(`Could not store Drive credential: ${credentialError.message}`);

  const connectionPatch = {
    user_id: input.userId,
    google_account_sub: input.googleSub,
    google_account_email: input.email ?? null,
    scopes: input.scopes,
    status: "connected" as const,
    connected_at: now,
    last_error: null,
    updated_at: now,
    ...(switchedAccount ? {
      root_folder_id: null, root_folder_url: null, semester_folder_id: null, semester_folder_url: null,
      inbox_folder_id: null, inbox_folder_url: null, last_scan_at: null, last_scan_status: null,
    } : {}),
  };
  const { error: connectionError } = await admin.from("study_drive_connections").upsert(connectionPatch, { onConflict: "user_id" });
  if (connectionError) throw new Error(`Could not store Drive connection: ${connectionError.message}`);

  if (switchedAccount) {
    const { data: semester, error: semesterError } = await admin.from("study_semesters")
      .select("id").eq("user_id", input.userId).eq("active", true).maybeSingle();
    if (semesterError) throw new Error(`Could not inspect active semester during Drive account switch: ${semesterError.message}`);
    if (semester?.id) {
      const { error: semesterResetError } = await admin.from("study_semesters").update({
        drive_root_folder_id: null, drive_root_folder_url: null,
        drive_semester_folder_id: null, drive_semester_folder_url: null,
        drive_inbox_folder_id: null, drive_inbox_folder_url: null,
        drive_last_scan_at: null, drive_last_scan_status: null, drive_last_scan_note: null,
        bootstrap_certified_at: null,
      }).eq("id", semester.id).eq("user_id", input.userId);
      if (semesterResetError) throw new Error(`Could not reset active-semester Drive state: ${semesterResetError.message}`);

      const { error: courseResetError } = await admin.from("study_courses")
        .update({ drive_folder_id: null, drive_folder_url: null, drive_folder_map: {} })
        .eq("semester_id", semester.id).eq("user_id", input.userId);
      if (courseResetError) throw new Error(`Could not reset active-semester course Drive state: ${courseResetError.message}`);
    }
  }
}

export async function disconnectDrive(userId: string) {
  const admin = createAdminClient();
  await admin.from("study_drive_credentials").delete().eq("user_id", userId);
  const { error } = await admin.from("study_drive_connections").update({
    status: "disconnected",
    google_account_sub: null,
    google_account_email: null,
    scopes: [],
    last_error: null,
  }).eq("user_id", userId);
  if (error) throw new Error(`Could not disconnect Drive: ${error.message}`);

  const { error: certificationError } = await admin.from("study_semesters")
    .update({ bootstrap_certified_at: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("active", true);
  if (certificationError) throw new Error(`Could not invalidate semester bootstrap after Drive disconnect: ${certificationError.message}`);
}
