import { NextResponse } from "next/server";
import { attachHistoricalPrior, removeHistoricalPrior } from "@/lib/study/semester-bootstrap-data";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>;
    const data=await attachHistoricalPrior({
      courseId:String(body.courseId??""),sourceCourseId:String(body.sourceCourseId??""),
      relation:String(body.relation??"related"),note:body.note==null?null:String(body.note),
    });
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status});
  }
}
export async function DELETE(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>;
    const data=await removeHistoricalPrior(String(body.priorId??""));
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status});
  }
}
