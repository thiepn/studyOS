import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {offlineReceiptMatches,type OfflineReceiptRequest} from "@/lib/study/offline-receipt-contract";
// Correctly shaped UUIDs only; one valid path per client-generated record.
const VALID_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS={"cache-control":"no-store"};
function parseRequest(value:unknown):OfflineReceiptRequest|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const row=value as Record<string,unknown>;
  if(typeof row.recordId!=="string"||!VALID_UUID.test(row.recordId))return null;
  if(row.kind==="attempt"&&typeof row.questionId==="string"&&VALID_UUID.test(row.questionId))
    return {kind:"attempt",recordId:row.recordId,questionId:row.questionId};
  if(row.kind==="session_start"&&typeof row.startedAt==="string"
    &&Number.isFinite(Date.parse(row.startedAt))
    &&["review","coursework","checkpoint","exam_simulation","relearning"].includes(String(row.sessionType))
    &&(row.courseId==null||(typeof row.courseId==="string"&&VALID_UUID.test(row.courseId)))
    &&Number.isInteger(row.plannedMinutes)&&Number(row.plannedMinutes)>=1&&Number(row.plannedMinutes)<=600)
    return {kind:"session_start",recordId:row.recordId,startedAt:row.startedAt,
      sessionType:String(row.sessionType),courseId:row.courseId==null?null:String(row.courseId),plannedMinutes:Number(row.plannedMinutes)};
  if(row.kind==="session_finish"&&typeof row.endedAt==="string"&&Number.isFinite(Date.parse(row.endedAt))
    &&(row.note==null||(typeof row.note==="string"&&row.note.length<=4000)))
    return {kind:"session_finish",recordId:row.recordId,endedAt:row.endedAt,note:row.note==null?null:String(row.note)};
  return null;
}
/** Authenticated SELECT only; do not return user data or stored answers.
 * A missing read permission must NOT be interpreted as record confirmation. */
export async function POST(request:Request){
  const input=parseRequest(await request.json().catch(()=>null));
  if(!input)return NextResponse.json({ok:false,error:"Invalid offline receipt request"},{status:400,headers:HEADERS});
  const supabase=await createClient();
  const {data,error}=await supabase.auth.getClaims();
  const userId=data?.claims?.sub?String(data.claims.sub):null;
  if(error||!userId||data?.claims?.is_anonymous===true)
    return NextResponse.json({ok:false,error:"Authenticated account required"},{status:401,headers:HEADERS});
  if(input.kind==="attempt"){
    const {data:receipt,error:readError}=await supabase.from("study_attempt_requests")
      .select("request_id,question_id,response").eq("user_id",userId)
      .eq("request_id",input.recordId).maybeSingle();
    if(readError)return NextResponse.json({ok:false,error:"Could not read attempt receipt"},{status:503,headers:HEADERS});
    return NextResponse.json({ok:true,recorded:offlineReceiptMatches(input,receipt)},{headers:HEADERS});
  }
  const {data:receipt,error:readError}=await supabase.from("study_sessions")
    .select("id,started_at,session_type,course_id,planned_minutes,ended_at,note")
    .eq("user_id",userId).eq("id",input.recordId).maybeSingle();
  if(readError)return NextResponse.json({ok:false,error:"Could not read session receipt"},{status:503,headers:HEADERS});
  return NextResponse.json({ok:true,recorded:offlineReceiptMatches(input,receipt)},{headers:HEADERS});
}
