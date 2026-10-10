/** Bounded, stable pagination of real owner-scoped attempt evidence.
 * Never silently truncate at Supabase/PostgREST's 1000 row default. */
export type PagedIndependentAttempt={id:string;question_id:string;course_id:string;independence:string};
export class FirstWeekPagingError extends Error{
  readonly code:string;
  constructor(code:string,message:string){super(message);this.name="FirstWeekPagingError";this.code=code;}
}
export const PROOF_PAGE_SIZE=500;
export const PROOF_ID_BATCH=40;
export const PROOF_MAX_ROWS=20000;

export async function readPagedIndependentAttempts(
  db:any,userId:string,courseIds:readonly string[],questionIds:readonly string[],
):Promise<PagedIndependentAttempt[]>{
  const courses=[...new Set(courseIds)],questions=[...new Set(questionIds)];
  if(!userId||!courses.length||!questions.length)return [];
  const attempts:PagedIndependentAttempt[]=[];
  for(let pos=0;pos<questions.length;pos+=PROOF_ID_BATCH){
    const batch=questions.slice(pos,pos+PROOF_ID_BATCH);
    for(let page=0;;page++){
      if(page*PROOF_PAGE_SIZE>=PROOF_MAX_ROWS||attempts.length>=PROOF_MAX_ROWS)
        throw new FirstWeekPagingError("first_week_proof_limit","Week-1 source proof exceeds safe retrieval budget");
      const offset=page*PROOF_PAGE_SIZE;
      const result=await db.from("study_attempts")
        .select("id,question_id,course_id,independence")
        .eq("user_id",userId).eq("independence","independent")
        .in("course_id",courses).in("question_id",batch)
        .order("id",{ascending:true}).range(offset,offset+PROOF_PAGE_SIZE-1);
      if(result.error)
        throw new FirstWeekPagingError(result.error.code||"first_week_proof_failed","Could not read independent attempt evidence");
      if(!Array.isArray(result.data))
        throw new FirstWeekPagingError("first_week_proof_incomplete","Week-1 proof response was incomplete");
      const records=result.data as PagedIndependentAttempt[];
      if(records.length>PROOF_PAGE_SIZE||attempts.length+records.length>PROOF_MAX_ROWS)
        throw new FirstWeekPagingError("first_week_proof_limit","Week-1 proof exceeds safe retrieval budget");
      attempts.push(...records);
      if(records.length<PROOF_PAGE_SIZE)break;
    }
  }
  return attempts;
}
