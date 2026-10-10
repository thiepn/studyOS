import { NextResponse } from "next/server";
import { createInitialSemester } from "@/lib/study/semester-bootstrap-data";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request){
  let input:unknown;
  try{input=await request.json();}catch{
    return NextResponse.json({ok:false,error:"Invalid semester JSON"},{status:400});
  }
  try{
    const data=await createInitialSemester(input);
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError
      ? error.code==="invalid_initial_semester"?400
      :error.code==="initial_semester_conflict"?409
      :["initial_semester_schema_unavailable","account_connection_unavailable"].includes(error.code)?503
      :["not_authenticated","permanent_account_required"].includes(error.code)?401:500
      :500;
    return NextResponse.json({ok:false,error:error instanceof StudyServiceError?error.message:"Could not create semester"},{status});
  }
}
