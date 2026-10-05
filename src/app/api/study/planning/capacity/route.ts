import { NextResponse } from "next/server";
import { setDailyCapacity } from "@/lib/study/planning";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>;
    const data=await setDailyCapacity({
      mode:String(body.mode??"normal"),
      customBudgetMinutes:body.customBudgetMinutes==null?null:Number(body.customBudgetMinutes),
      planDate:body.planDate==null?null:String(body.planDate),
      note:body.note==null?null:String(body.note),
    });
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status});
  }
}
