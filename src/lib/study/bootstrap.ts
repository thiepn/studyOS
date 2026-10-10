import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { StudyServiceError } from "./errors";

export async function getStudyWorkspaceState(existingClient?: SupabaseClient<Database>) {
  const supabase = existingClient ?? await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) throw new StudyServiceError("Authentication required", "not_authenticated", claimsError);
  if (claimsData.claims.is_anonymous === true) throw new StudyServiceError("A permanent THIEPN Account is required", "permanent_account_required");
  const userId=String(claimsData.claims.sub);

  const active = await supabase.from("study_semesters").select("id,stable_key,display_name")
    .eq("user_id",userId).eq("active",true).maybeSingle();
  if (active.error) throw new StudyServiceError("Could not inspect the active StudyOS semester", active.error.code || "study_init_check_failed", active.error);
  if (active.data?.id) return {
    userId,
    activeSemester: active.data,
    hasAnySemester: true,
  };

  const historical = await supabase.from("study_semesters").select("id").eq("user_id",userId).limit(1);
  if (historical.error) throw new StudyServiceError("Could not inspect StudyOS semester history", historical.error.code || "study_init_check_failed", historical.error);
  return {
    userId,
    activeSemester: null,
    hasAnySemester: (historical.data??[]).length>0,
  };
}

export async function ensureStudyWorkspace(existingClient?: SupabaseClient<Database>) {
  const state=await getStudyWorkspaceState(existingClient);
  if (!state.activeSemester) {
    throw new StudyServiceError(
      state.hasAnySemester
        ? "No active semester is configured. Open Semester Rollover to create or recover the next workspace."
        : "No semester is configured yet. Open Semester Setup to create your first workspace.",
      "no_active_semester",
    );
  }

  return {
    semesterId: state.activeSemester.id,
    userId: state.userId,
    initialized: false,
    semesterKey: state.activeSemester.stable_key,
    semesterName: state.activeSemester.display_name,
  };
}
