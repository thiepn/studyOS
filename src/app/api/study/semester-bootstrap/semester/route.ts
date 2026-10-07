import { NextResponse } from "next/server";
import { createInitialSemester } from "@/lib/study/semester-bootstrap-data";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request){
  try{
    const data=await createInitialSemester(await request.json());
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code==="invalid_initial_semester"?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Could not create semester"},{status});
  }
}
