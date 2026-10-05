import { NextResponse } from "next/server";
import { setCommitmentStatus } from "@/lib/study/planning";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params; const body=await request.json() as Record<string,unknown>;
    const data=await setCommitmentStatus(id,String(body.status??"completed"));
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status});
  }
}
