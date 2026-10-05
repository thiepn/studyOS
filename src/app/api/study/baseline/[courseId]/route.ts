import { NextResponse } from "next/server";
import { classifyBaselineSkill, completeBaseline, startBaseline } from "@/lib/study/baseline";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request,{params}:{params:Promise<{courseId:string}>}){
  try{
    const {courseId}=await params;const body=await request.json() as Record<string,unknown>;const action=String(body.action??"");
    let data:unknown;
    if(action==="start")data=await startBaseline(courseId);
    else if(action==="classify")data=await classifyBaselineSkill({
      courseId,skillId:String(body.skillId??""),classification:String(body.classification??""),
      confidence:body.confidence==null?null:Number(body.confidence),note:body.note==null?null:String(body.note),
    });
    else if(action==="complete")data=await completeBaseline(courseId);
    else return NextResponse.json({ok:false,error:"Unsupported baseline action"},{status:400});
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Baseline action failed"},{status});
  }
}
