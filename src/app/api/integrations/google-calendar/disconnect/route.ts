import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { disconnectCalendar } from "@/lib/google-calendar/connection";
import { ConnectionSwitchError } from "@/lib/study/connection-recovery";
import { env } from "@/lib/env";
import { isQualifiedAppOrigin } from "@/lib/study/origin-qualification";
import { validAuthSubmission } from "@/lib/study/auth-flow";

export async function POST(request:Request){
  if(!isQualifiedAppOrigin(env.appOrigin,env.deploymentEnv)||
     !validAuthSubmission(env.appOrigin,new URL(request.url).origin,request.headers.get("origin")))
    return NextResponse.json({ok:false,error:"Untrusted disconnect request"},{status:403});
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const userId=data?.claims?.sub?String(data.claims.sub):null;
  if(!userId)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{await disconnectCalendar(userId);return NextResponse.json({ok:true,note:"Study Calendar disconnected."});}
  catch(error){
    if(error instanceof ConnectionSwitchError)
      return NextResponse.json({ok:false,error:error.message},{status:409});
    return NextResponse.json({ok:false,error:"Could not disconnect Study Calendar. Retry from Account."},{status:500});
  }
}
