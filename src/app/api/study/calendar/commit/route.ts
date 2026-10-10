import { NextResponse } from "next/server";
import { commitTodaySchedule } from "@/lib/study/calendar-autopilot";
import { StudyServiceError } from "@/lib/study/errors";

// A direct POST cannot bypass the review checkbox displayed in Study Calendar.
export async function POST(request:Request){
  const input=await request.json().catch(()=>null);
  if(!input||typeof input!=="object"||(input as {confirmed?:unknown}).confirmed!==true)
    return NextResponse.json({ok:false,error:"Explicit Calendar event creation confirmation required"},{status:400});
  try{const data=await commitTodaySchedule(true);return NextResponse.json({ok:true,...data});}
  catch(error){
    const status=error instanceof StudyServiceError
      ?(error.code==="auth_required"?401:error.code==="calendar_write_not_authorized"?409:500):500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Could not commit schedule"},{status});
  }
}
