/** Safe read-only backend admission. A local build or valid publishable key
 * cannot prove the deployed StudyOS SQL contract is present. */
export type StudyBackendReadiness = {
  healthy:boolean;
  semesterInitialized:boolean|null;
  courseCount:number|null;
  message:string;
};

export function evaluateStudyBackendReadiness(
  payload:unknown,
  errorMessage:string|null = null,
):StudyBackendReadiness {
  if(errorMessage) return {
    healthy:false,semesterInitialized:null,courseCount:null,
    message:"StudyOS database readiness RPC failed. Check the deployed project's migrations and authorized session.",
  };
  if(!payload||typeof payload!=="object"||Array.isArray(payload))
    return {healthy:false,semesterInitialized:null,courseCount:null,
      message:"StudyOS readiness RPC returned an invalid contract."};
  const row=payload as Record<string,unknown>;
  if(typeof row.workspace_initialized!=="boolean" ||
      typeof row.course_count!=="number" ||
      !Number.isSafeInteger(row.course_count) || row.course_count<0)
    return {healthy:false,semesterInitialized:null,courseCount:null,
      message:"StudyOS readiness RPC returned an incompatible schema."};
  return {
    healthy:true,
    semesterInitialized:row.workspace_initialized,
    courseCount:row.course_count,
    message:row.workspace_initialized?
      "Authenticated StudyOS database is reachable; the active semester can be inspected.":
      "Authenticated StudyOS database is reachable; no semester has been initialized yet.",
  };
}

/** Access via the signed-in Supabase client: no elevated credentials, no mutation. */
export async function inspectStudyBackendReadiness(
  db:{rpc:(name:string)=>Promise<{data:unknown;error:{message?:string}|null}>},
):Promise<StudyBackendReadiness> {
  try {
    const result=await db.rpc("study_readiness_snapshot");
    return evaluateStudyBackendReadiness(result.data,result.error?.message??null);
  } catch {
    return evaluateStudyBackendReadiness(null,"transport_failed");
  }
}
