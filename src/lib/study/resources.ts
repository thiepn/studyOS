import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import type { IngestionCandidateInput, ResourceRegistrationInput, ResourcesData } from "./types";
import type { Json, StudyResourceType, StudySourceAuthority } from "@/lib/supabase/database.types";
import { extractGoogleDriveFileId } from "./resource-utils";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_TYPES=new Set<StudyResourceType>(["lecture","exercise","solution","script","exam","exam_solution","reference","supplement","course_info","other"]);
const AUTHORITIES=new Set<StudySourceAuthority>(["official_solution","official_course","assigned_reference","reference","ai_generated","unknown"]);

export function parseResourceRegistration(value:unknown):ResourceRegistrationInput{
  if(!value||typeof value!=="object")throw new StudyServiceError("Invalid resource payload","invalid_resource");
  const input=value as Record<string,unknown>;
  const courseId=String(input.courseId??""); const resourceType=String(input.resourceType??"") as StudyResourceType;
  const title=String(input.title??"").trim(); const driveUrl=input.driveUrl==null?undefined:String(input.driveUrl).trim();
  const explicitId=input.driveFileId==null?undefined:String(input.driveFileId).trim();
  const driveFileId=explicitId||(driveUrl?extractGoogleDriveFileId(driveUrl)??undefined:undefined);
  const sourceAuthority=(input.sourceAuthority==null?"unknown":String(input.sourceAuthority)) as StudySourceAuthority;
  const weekNo=input.weekNo==null||input.weekNo===""?undefined:Number(input.weekNo);
  if(!UUID.test(courseId))throw new StudyServiceError("Valid courseId is required","invalid_resource");
  if(!RESOURCE_TYPES.has(resourceType))throw new StudyServiceError("Invalid resource type","invalid_resource");
  if(!AUTHORITIES.has(sourceAuthority))throw new StudyServiceError("Invalid source authority","invalid_resource");
  if(!title||title.length>240)throw new StudyServiceError("Resource title must be 1–240 characters","invalid_resource");
  if(!driveFileId)throw new StudyServiceError("A Google Drive file URL or file ID is required","invalid_resource");
  if(weekNo!=null&&(!Number.isInteger(weekNo)||weekNo<1||weekNo>40))throw new StudyServiceError("Invalid teaching week","invalid_resource");
  return {courseId,resourceType,title,driveUrl,driveFileId,originalFilename:input.originalFilename==null?undefined:String(input.originalFilename).slice(0,500),mimeType:input.mimeType==null?undefined:String(input.mimeType).slice(0,200),weekNo,sourceAuthority,publishedAt:input.publishedAt==null||input.publishedAt===""?undefined:String(input.publishedAt),contentSha256:input.contentSha256==null||input.contentSha256===""?undefined:String(input.contentSha256).toLowerCase(),logicalKey:input.logicalKey==null||input.logicalKey===""?undefined:String(input.logicalKey).slice(0,240)};
}

export function parseCandidateInput(value:unknown):IngestionCandidateInput{
  if(!value||typeof value!=="object")throw new StudyServiceError("Invalid candidate payload","invalid_candidate");
  const input=value as Record<string,unknown>;
  if(!input.payload||typeof input.payload!=="object"||Array.isArray(input.payload))throw new StudyServiceError("payload must be an object","invalid_candidate");
  const extractionConfidence=input.extractionConfidence==null?undefined:Number(input.extractionConfidence);
  if(extractionConfidence!=null&&(!Number.isFinite(extractionConfidence)||extractionConfidence<0||extractionConfidence>1))throw new StudyServiceError("Invalid extraction confidence","invalid_candidate");
  return {payload:input.payload as Json,processor:input.processor==null?undefined:String(input.processor).slice(0,120),processorVersion:input.processorVersion==null?undefined:String(input.processorVersion).slice(0,120),extractionConfidence,validationIssues:(input.validationIssues??[]) as Json};
}

export async function getResourcesData():Promise<ResourcesData>{
  const supabase=await createClient(); const {semesterId}=await ensureStudyWorkspace(supabase);
  const [coursesResult,resourcesResult,runsResult,driveResult,intakeResult]=await Promise.all([
    supabase.from("study_courses").select("id,display_name,short_name,sort_order,drive_folder_url").eq("semester_id",semesterId).eq("active",true).order("sort_order"),
    supabase.from("study_resources").select("*").eq("active",true).order("created_at",{ascending:false}),
    supabase.from("study_ingestion_runs").select("*").order("created_at",{ascending:false}),
    supabase.from("study_drive_connections").select("status,google_account_email,inbox_folder_url,last_scan_at,last_scan_status,last_error").maybeSingle(),
    supabase.from("study_intake_items").select("*").eq("semester_id",semesterId).order("last_seen_at",{ascending:false}).limit(100),
  ]);
  const error=coursesResult.error||resourcesResult.error||runsResult.error||driveResult.error||intakeResult.error;
  if(error)throw new StudyServiceError("Could not load resource inbox",error.code||"resource_read_failed",error);
  return {semesterId,courses:coursesResult.data??[],resources:resourcesResult.data??[],ingestionRuns:runsResult.data??[],driveConnection:driveResult.data??null,intakeItems:intakeResult.data??[]};
}

export async function registerResource(input:ResourceRegistrationInput){
  const supabase=await createClient();
  const {data,error}=await supabase.rpc("study_register_resource",{p_course_id:input.courseId,p_resource_type:input.resourceType,p_title:input.title,p_drive_file_id:input.driveFileId??undefined,p_drive_url:input.driveUrl??undefined,p_original_filename:input.originalFilename??undefined,p_mime_type:input.mimeType??undefined,p_week_no:input.weekNo??undefined,p_source_authority:input.sourceAuthority??"unknown",p_published_at:input.publishedAt??undefined,p_content_sha256:input.contentSha256??undefined,p_logical_key:input.logicalKey??undefined});
  if(error)throw new StudyServiceError("Could not register resource",error.code||"resource_register_failed",error); return data;
}
export async function submitIngestionCandidate(runId:string,input:IngestionCandidateInput){
  if(!UUID.test(runId))throw new StudyServiceError("Invalid ingestion run","invalid_candidate");
  const supabase=await createClient();
  const {data,error}=await supabase.rpc("study_submit_ingestion_candidate",{p_run_id:runId,p_payload:input.payload,p_processor:input.processor??undefined,p_processor_version:input.processorVersion??undefined,p_extraction_confidence:input.extractionConfidence??undefined,p_validation_issues:input.validationIssues??[]});
  if(error)throw new StudyServiceError("Could not store ingestion candidate",error.code||"candidate_submit_failed",error); return data;
}
export async function decideIngestion(runId:string,action:"accept"|"reject",reason?:string){
  if(!UUID.test(runId))throw new StudyServiceError("Invalid ingestion run","invalid_candidate");
  const supabase=await createClient();
  const result=action==="accept"?await supabase.rpc("study_accept_ingestion_run",{p_run_id:runId}):await supabase.rpc("study_reject_ingestion_run",{p_run_id:runId,p_reason:reason??undefined});
  if(result.error)throw new StudyServiceError(`Could not ${action} ingestion`,result.error.code||"ingestion_decision_failed",result.error);
  return result.data;
}
