import { NextResponse } from "next/server";
import { abandonExamSimulation, finishExamSimulation, gradeExamItem, saveExamResponse, startExamSimulation, submitExamSimulation } from "@/lib/study/exams";
import { StudyServiceError } from "@/lib/study/errors";

function responseError(error:unknown){
  const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
  return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status});
}

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>;
    const action=String(body.action??"");
    let data:unknown;
    if(action==="start") data=await startExamSimulation(String(body.examId??""),String(body.sessionId??""),String(body.startedAt??""));
    else if(action==="save") data=await saveExamResponse({
      simulationId:String(body.simulationId??""),examQuestionId:String(body.examQuestionId??""),
      responseText:body.responseText==null?null:String(body.responseText),durationSeconds:Number(body.durationSeconds??0),
    });
    else if(action==="submit"){
      const responses=Array.isArray(body.responses)?body.responses.map((r)=>{
        const x=(r??{}) as Record<string,unknown>;
        return {examQuestionId:String(x.examQuestionId??""),responseText:x.responseText==null?null:String(x.responseText),durationSeconds:Number(x.durationSeconds??0)};
      }):[];
      data=await submitExamSimulation({simulationId:String(body.simulationId??""),responses,submittedAt:String(body.submittedAt??"")});
    } else if(action==="grade"){
      data=await gradeExamItem({
        simulationId:String(body.simulationId??""),examQuestionId:String(body.examQuestionId??""),
        awardedPoints:Number(body.awardedPoints),errorTypes:Array.isArray(body.errorTypes)?body.errorTypes as any:[],
        selfConfidence:body.selfConfidence==null?null:Number(body.selfConfidence),
      });
    } else if(action==="finish") data=await finishExamSimulation(String(body.simulationId??""),body.note==null?null:String(body.note));
    else if(action==="abandon") data=await abandonExamSimulation(String(body.simulationId??""));
    else return NextResponse.json({ok:false,error:"Unsupported exam action"},{status:400});
    return NextResponse.json({ok:true,data});
  }catch(error){return responseError(error);}
}
