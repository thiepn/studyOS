import { env, serverConfigurationStatus } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { evaluateReadiness, type BackendReadiness } from "./readiness-state";

export async function getReadinessData() {
  const supabase = await createClient();
  await ensureStudyWorkspace(supabase);
  const [{ data, error }, calendarResult] = await Promise.all([
    (supabase.rpc as any)("study_readiness_snapshot"),
    (supabase as any).from("study_calendar_connections").select("status,google_account_email,last_sync_at,last_sync_status").maybeSingle(),
  ]);
  if (error) throw new StudyServiceError("Could not load readiness state", error.code || "readiness_failed", error);

  const server = serverConfigurationStatus();
  const backend = (data ?? {}) as BackendReadiness;
  return {
    server,
    backend,
    evaluation: evaluateReadiness(server, backend),
    googleDriveScopeMode: env.googleDriveScopeMode,
    calendarConnection: calendarResult.data ?? null,
  };
}
