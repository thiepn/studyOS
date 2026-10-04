import { createClient } from "@/lib/supabase/server";
import { StudyServiceError } from "./errors";
import { buildProcessingBrief, type ProcessingPacket } from "./processing-policy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getProcessingPacket(runId: string) {
  if (!UUID.test(runId)) throw new StudyServiceError("Invalid ingestion run", "invalid_candidate");
  const supabase = await createClient();
  const { data, error } = await (supabase.rpc as any)("study_get_processing_packet", { p_run_id: runId });
  if (error) throw new StudyServiceError("Could not prepare processing packet", error.code || "processing_packet_failed", error);
  const packet = data as ProcessingPacket;
  return { packet, brief: buildProcessingBrief(packet) };
}

export { buildProcessingBrief, processingProfile, parseCandidateJsonText } from "./processing-policy";
