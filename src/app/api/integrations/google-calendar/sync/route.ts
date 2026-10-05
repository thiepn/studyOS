import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncStudyCalendar } from "@/lib/google-calendar/sync";

export async function POST(){
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const userId=data?.claims?.sub?String(data.claims.sub):null;
  if(!userId)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{const result=await syncStudyCalendar(userId);return NextResponse.json({ok:true,...result,note:"Calendar synced."});}
  catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Calendar sync failed"},{status:500});}
}
