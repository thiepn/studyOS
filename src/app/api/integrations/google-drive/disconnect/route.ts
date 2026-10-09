import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { disconnectDrive } from "@/lib/google-drive/connection";
import { env } from "@/lib/env";
import { isQualifiedAppOrigin } from "@/lib/study/origin-qualification";
import { validAuthSubmission } from "@/lib/study/auth-flow";

export async function POST(request:Request) {
  if(!isQualifiedAppOrigin(env.appOrigin,env.deploymentEnv)||
     !validAuthSubmission(env.appOrigin,new URL(request.url).origin,request.headers.get("origin")))
    return NextResponse.json({ok:false,error:"Untrusted disconnect request"},{status:403});
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ? String(data.claims.sub) : undefined;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try{await disconnectDrive(userId);return NextResponse.json({ok:true,note:"Study Drive disconnected; files are unchanged."});}
  catch{ return NextResponse.json({ok:false,error:"Could not disconnect Study Drive. Retry from Account."},{status:500}); }
}
