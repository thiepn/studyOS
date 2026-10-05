import { NextResponse } from "next/server";
import { updateExamMetadata } from "@/lib/study/exams";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params; const body=await request.json() as Record<string,unknown>;
    const data=await updateExamMetadata(id,{
      syllabusRelevance:Number(body.syllabusRelevance),active:body.active!==false,
      notes:body.notes==null?null:String(body.notes).slice(0,4000),
    });
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status});
  }
}
