import { StudyServiceError } from "./errors";
import { buildFirstWeekProof, type FirstWeekProof, type ProofWeek, type ProofResource,
  type ProofLink, type ProofQuestion, type ProofAttempt } from "./first-week-proof";

/** Read-only, user-scoped acceptance evidence. No service-role bypass, seed
 * objects, or synthetic attempts. Requires the existing RLS policies. */
export async function getFirstWeekProof(
  db:any,userId:string,majorIds:readonly string[],
):Promise<FirstWeekProof[]> {
  const ids=[...new Set(majorIds)];
  if(!ids.length)return [];
  const weeks=await db.from("study_teaching_weeks").select("id,course_id,week_no")
    .eq("user_id",userId).in("course_id",ids).eq("week_no",1);
  if(weeks.error)throw new StudyServiceError("Could not verify Week-1 source weeks",
    weeks.error.code||"first_week_proof_failed",weeks.error);
  const weekRows=(weeks.data??[]) as ProofWeek[];
  if(!weekRows.length)return buildFirstWeekProof(ids,[],[],[],[],[]);

  const resourceResult=await db.from("study_resources")
    .select("id,course_id,teaching_week_id,processing_status,active,resource_type")
    .eq("user_id",userId).eq("active",true).eq("processing_status","verified")
    .in("teaching_week_id",weekRows.map(w=>w.id))
    .in("resource_type",["lecture","exercise"]);
  if(resourceResult.error)throw new StudyServiceError("Could not verify Week-1 course material",
    resourceResult.error.code||"first_week_proof_failed",resourceResult.error);
  const resources=(resourceResult.data??[]) as ProofResource[];
  if(!resources.length)return buildFirstWeekProof(ids,weekRows,[],[],[],[]);

  const sources=await db.from("study_question_sources").select("question_id,resource_id")
    .eq("user_id",userId).in("resource_id",resources.map(r=>r.id));
  if(sources.error)throw new StudyServiceError("Could not verify question source lineage",
    sources.error.code||"first_week_proof_failed",sources.error);
  const links=(sources.data??[]) as ProofLink[];
  const questionIds=[...new Set(links.map(link=>link.question_id))];
  if(!questionIds.length)return buildFirstWeekProof(ids,weekRows,resources,[],[],[]);

  const questionsResult=await db.from("study_questions")
    .select("id,course_id,active").eq("user_id",userId).eq("active",true)
    .in("course_id",ids).in("id",questionIds);
  if(questionsResult.error)throw new StudyServiceError("Could not verify active, approved source questions",
    questionsResult.error.code||"first_week_proof_failed",questionsResult.error);
  const questions=(questionsResult.data??[]) as ProofQuestion[];
  const activeIds=questions.map(q=>q.id);
  if(!activeIds.length)return buildFirstWeekProof(ids,weekRows,resources,links,[],[]);

  const attempts=await readAllFirstWeekIndependentAttempts(db,userId,ids,activeIds);
  return buildFirstWeekProof(ids,weekRows,resources,links,questions,attempts);
}

/** PostgREST defaults and previous .limit(1000) silently hid valid historical
 * independent attempts. Paginate by stable unique id, with bounded pages and
 * question-ID batches. If the safety bound is exceeded, fail closed rather
 * than misreporting missing academic evidence or making unbounded requests. */
const PROOF_PAGE_SIZE=500;
const PROOF_ID_BATCH=40;
const PROOF_MAX_ROWS=20000;

export async function readAllFirstWeekIndependentAttempts(
  db:any,userId:string,courseIds:readonly string[],questionIds:readonly string[],
):Promise<ProofAttempt[]>{
  const courses=[...new Set(courseIds)],questions=[...new Set(questionIds)];
  if(!userId||!courses.length||!questions.length)return [];
  const attempts:ProofAttempt[]=[];
  for(let pos=0;pos<questions.length;pos+=PROOF_ID_BATCH){
    const batch=questions.slice(pos,pos+PROOF_ID_BATCH);
    for(let page=0;;page++){
      if(page*PROOF_PAGE_SIZE>=PROOF_MAX_ROWS||attempts.length>=PROOF_MAX_ROWS)
        throw new StudyServiceError("Week-1 proof exceeds safe retrieval budget; use scoped reconciliation",
          "first_week_proof_limit");
      const offset=page*PROOF_PAGE_SIZE;
      const result=await db.from("study_attempts")
        .select("id,question_id,course_id,independence")
        .eq("user_id",userId).eq("independence","independent")
        .in("course_id",courses).in("question_id",batch)
        .order("id",{ascending:true}).range(offset,offset+PROOF_PAGE_SIZE-1);
      if(result.error)throw new StudyServiceError("Could not verify recorded independent Week-1 attempts",
        result.error.code||"first_week_proof_failed",result.error);
      if(!Array.isArray(result.data))
        throw new StudyServiceError("Week-1 proof response was incomplete","first_week_proof_incomplete");
      const records=result.data as ProofAttempt[];
      if(records.length>PROOF_PAGE_SIZE||attempts.length+records.length>PROOF_MAX_ROWS)
        throw new StudyServiceError("Week-1 proof exceeds safe retrieval budget","first_week_proof_limit");
      attempts.push(...records);
      if(records.length<PROOF_PAGE_SIZE)break;
    }
  }
  return attempts;
}
