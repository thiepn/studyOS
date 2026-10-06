import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshDriveAccessToken } from "@/lib/google-drive/client";
import { createSemesterDriveTree } from "@/lib/google-drive/setup";

export async function POST(){
  try{
    const supabase=await createClient();
    const {data,error}=await supabase.auth.getClaims();
    const userId=data?.claims?.sub?String(data.claims.sub):null;
    if(error||!userId)return NextResponse.json({error:"Authentication required"},{status:401});
    const token=await refreshDriveAccessToken(userId);
    const dataResult=await createSemesterDriveTree(userId,token);
    return NextResponse.json({ok:true,data:dataResult});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Could not provision Study Drive"},{status:500});
  }
}
