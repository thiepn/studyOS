import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { disconnectCalendar } from "@/lib/google-calendar/connection";

export async function POST(){
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const userId=data?.claims?.sub?String(data.claims.sub):null;
  if(!userId)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{await disconnectCalendar(userId);return NextResponse.json({ok:true,note:"Study Calendar disconnected."});}
  catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Disconnect failed"},{status:500});}
}
