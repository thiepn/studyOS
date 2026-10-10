import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {offlineReceiptMatches,parseOfflineReceiptRequest} from "@/lib/study/offline-receipt-contract";
// Correctly shaped UUIDs only; one valid path per client-generated record.
/** Authenticated SELECT only; do not return user data or stored answers.
 * A missing read permission must NOT be interpreted as record confirmation. */
export async function POST(request:Request){
  const input=parseOfflineReceiptRequest(await request.json().catch(()=>null));
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
