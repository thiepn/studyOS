import { NextResponse } from "next/server";
import { recordExamResult } from "@/lib/study/exam-results-data";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>;
    const rawScore=body.scorePercent;
    const scorePercent=rawScore==null||rawScore===""?null:Number(rawScore);
    const data=await recordExamResult({
      courseId:String(body.courseId??""),
      attemptNo:Number(body.attemptNo),
      resultStatus:String(body.resultStatus??"provisional") as any,
      outcome:String(body.outcome??"passed") as any,
      gradeText:body.gradeText==null?null:String(body.gradeText),
      scorePercent,
      retakeDecision:String(body.retakeDecision??"not_applicable") as any,
      nextExamAt:body.nextExamAt==null||body.nextExamAt===""?null:String(body.nextExamAt),
      sourceNote:body.sourceNote==null?null:String(body.sourceNote),
      sourceUrl:body.sourceUrl==null?null:String(body.sourceUrl),
    });
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status});
  }
}
