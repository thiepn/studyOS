import { NextResponse } from "next/server";
import { createCommitment } from "@/lib/study/planning";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request){
  try{
    const data=await createCommitment(await request.json() as Record<string,unknown>);
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status});
  }
}
