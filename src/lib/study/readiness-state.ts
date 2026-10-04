export type ServerReadiness = {
  deploymentEnv: string;
  appOrigin: string;
  secureOrigin: boolean;
  hasSupabaseSecret: boolean;
  hasGoogleDriveClientId: boolean;
  hasGoogleDriveClientSecret: boolean;
  hasDriveTokenKey: boolean;
  googleDriveConfigured: boolean;
  authCallbackUrl: string;
  googleDriveCallbackUrl: string;
  buildSha: string | null;
};

export type BackendReadiness = {
  workspace_initialized?: boolean;
  course_count?: number;
  named_course_count?: number;
  courses_ready?: boolean;
  drive_connected?: boolean;
  drive_tree_ready?: boolean;
  resource_count?: number;
  verified_resource_count?: number;
  skill_count?: number;
  question_count?: number;
  first_material_ready?: boolean;
};

export function evaluateReadiness(server: ServerReadiness, backend: BackendReadiness) {
  const blockers: string[] = [];
  if (!server.hasSupabaseSecret) blockers.push("Supabase server secret is not configured.");
  if (!server.secureOrigin) blockers.push("Production APP_ORIGIN must use HTTPS.");
  if (!server.googleDriveConfigured) blockers.push("StudyOS Google Drive OAuth credentials are incomplete.");
  if (!backend.workspace_initialized) blockers.push("Semester workspace is not initialized.");
  if (!backend.courses_ready) blockers.push("The six real WS26/27 courses are not fully onboarded.");
  if (!backend.drive_connected) blockers.push("The dedicated Study Google Drive account is not connected.");
  if (!backend.drive_tree_ready) blockers.push("The Semester OS Drive tree is not fully provisioned.");

  const infrastructureReady = blockers.length === 0;
  const firstWeekOperational = infrastructureReady && Boolean(backend.first_material_ready);
  return { blockers, infrastructureReady, firstWeekOperational };
}
