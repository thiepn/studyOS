import { NextResponse } from "next/server";
import { commitHandoffWeek } from "@/lib/study/weekly-handoff-data";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>;
    const data=await commitHandoffWeek({
      objective:String(body.objective??"balanced"),
      capacityMinutes:body.capacityMinutes==null?null:Number(body.capacityMinutes),
    });
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status});
  }
}
