import { NextResponse } from "next/server";
import { rolloverSemester } from "@/lib/study/semester-rollover-data";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,unknown>;
    const data=await rolloverSemester({
      sourceSemesterId:String(body.sourceSemesterId??""),
      stableKey:String(body.stableKey??""),
      displayName:String(body.displayName??""),
      startsOn:String(body.startsOn??""),
      endsOn:body.endsOn==null||body.endsOn===""?null:String(body.endsOn),
      timezone:String(body.timezone??"Europe/Berlin"),
    });
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&error.code.startsWith("invalid_")?400:500;
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status});
  }
}
