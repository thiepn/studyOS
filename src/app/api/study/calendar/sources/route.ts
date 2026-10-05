import { NextResponse } from "next/server";
import { updateCalendarSources } from "@/lib/study/calendar-autopilot";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request){
  try{
    const body=await request.json() as {selectedIds?:unknown};
    const selectedIds=Array.isArray(body.selectedIds)?body.selectedIds.map(String):[];
    const data=await updateCalendarSources(selectedIds);
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Could not update calendars"},{status});
  }
}
