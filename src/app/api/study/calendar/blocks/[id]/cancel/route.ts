import { NextResponse } from "next/server";
import { cancelScheduledBlock } from "@/lib/study/calendar-autopilot";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  try{const {id}=await params;const data=await cancelScheduledBlock(id);return NextResponse.json({ok:true,data});}
  catch(error){const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Could not cancel scheduled block"},{status});}
}
