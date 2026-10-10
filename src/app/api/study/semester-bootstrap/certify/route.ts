import { NextResponse } from "next/server";
import { certifySemesterBootstrap } from "@/lib/study/semester-bootstrap-data";
import { StudyServiceError } from "@/lib/study/errors";

/** Explicit owner review request at the HTTP boundary; server RPC evidence
 * validation remains authoritative and independently checks the actual data. */
export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object"||Array.isArray(body)||(body as {reviewed?:unknown}).reviewed!==true)
    return NextResponse.json({ok:false,error:"Explicit review confirmation is required before semester certification"},{status:400});
  try{
    const data=await certifySemesterBootstrap();
    return NextResponse.json({ok:true,data});
  }catch(error){
    const status=error instanceof StudyServiceError&&["not_authenticated","permanent_account_required"].includes(error.code)?401:400;
    return NextResponse.json({ok:false,error:error instanceof StudyServiceError?error.message:"Could not certify semester bootstrap"},{status});
  }
}
