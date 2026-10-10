import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { isQualifiedAppOrigin } from "@/lib/study/origin-qualification";
import { validAuthSubmission } from "@/lib/study/auth-flow";

export async function POST(request: NextRequest) {
  const origin=new URL(request.url).origin;
  if(!isQualifiedAppOrigin(env.appOrigin,env.deploymentEnv)
    ||!validAuthSubmission(env.appOrigin,origin,request.headers.get("origin")))
    return NextResponse.json({ok:false,error:"Untrusted account-switch request"},{status:403,headers:{"cache-control":"no-store"}});
  const data=await request.formData().catch(()=>null);
  const service=data?.get("service");
  if(service!=="drive"&&service!=="calendar")
    return NextResponse.json({ok:false,error:"Invalid integration"},{status:400,headers:{"cache-control":"no-store"}});
  const supabase=await createClient();
  const {data:claims,error}=await supabase.auth.getClaims();
  if(error||!claims?.claims?.sub||claims.claims.is_anonymous===true)return NextResponse.json({ok:false,error:"A permanent authenticated account is required"},{status:401});
  const userId=String(claims.claims.sub);
  const store=await cookies();
  store.set(`study_${service}_switch_intent`,userId,{
    httpOnly:true,secure:env.appOrigin.startsWith("https:"),sameSite:"lax",path:"/",maxAge:600,
  });
  return NextResponse.redirect(new URL(`/api/integrations/google-${service}/start`,env.appOrigin),303);
}
