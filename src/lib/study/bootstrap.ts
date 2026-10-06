import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { StudyServiceError } from "./errors";

export async function ensureStudyWorkspace(existingClient?: SupabaseClient<Database>) {
  const supabase = existingClient ?? await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) throw new StudyServiceError("Authentication required", "not_authenticated", claimsError);
  if (claimsData.claims.is_anonymous === true) throw new StudyServiceError("A permanent THIEPN Account is required", "permanent_account_required");
  const userId=String(claimsData.claims.sub);

  const active = await supabase.from("study_semesters").select("id,stable_key,display_name")
    .eq("active",true).maybeSingle();
  if (active.error) throw new StudyServiceError("Could not inspect active Semester OS workspace", active.error.code || "study_init_check_failed", active.error);
  if (active.data?.id) return {
    semesterId: active.data.id,
    userId,
    initialized: false,
    semesterKey: active.data.stable_key,
    semesterName: active.data.display_name,
  };

  const historical = await supabase.from("study_semesters").select("id").limit(1);
  if (historical.error) throw new StudyServiceError("Could not inspect Semester OS history", historical.error.code || "study_init_check_failed", historical.error);
  if ((historical.data??[]).length) {
    throw new StudyServiceError(
      "No active semester is configured. Open Semester Rollover to create or recover the next workspace.",
      "no_active_semester",
    );
  }

  const connection = await supabase.rpc("connect_thiepn_app", { p_app_slug: "semester-os" });
  if (connection.error) throw new StudyServiceError("Could not connect Semester OS to THIEPN Account", connection.error.code || "account_connection_failed", connection.error);

  const init = await supabase.rpc("study_initialize_ws2627");
  if (init.error) throw new StudyServiceError("Could not initialize WS26/27", init.error.code || "study_init_failed", init.error);
  const payload = init.data as { semester_id?: string; stable_key?:string } | null;
  if (!payload?.semester_id) throw new StudyServiceError("Initialization returned no semester ID", "invalid_init_response");
  return {
    semesterId: payload.semester_id,
    userId,
    initialized: true,
    semesterKey: payload.stable_key??"ws26_27",
    semesterName: "WS26/27",
  };
}
