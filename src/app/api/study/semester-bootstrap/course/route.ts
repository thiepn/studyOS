import { NextResponse } from "next/server";
import { createBootstrapCourse } from "@/lib/study/semester-bootstrap-data";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request){
  let input:unknown;
  try{input=await request.json();}catch{
    return NextResponse.json({ok:false,error:"Invalid course JSON"},{status:400});
  }
  try{
    const data=await createBootstrapCourse(input);
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError
      ?error.code.startsWith("invalid_")?400
      :error.code==="course_already_exists"?409
      :["not_authenticated","permanent_account_required"].includes(error.code)?401:500:500;
    return NextResponse.json({ok:false,error:error instanceof StudyServiceError?error.message:"Could not add course"},{status});
  }
}
