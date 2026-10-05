import { NextResponse } from "next/server";
import { commitTodaySchedule } from "@/lib/study/calendar-autopilot";

export async function POST(){
  try{const data=await commitTodaySchedule();return NextResponse.json({ok:true,...data});}
  catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Could not commit schedule"},{status:500});}
}
