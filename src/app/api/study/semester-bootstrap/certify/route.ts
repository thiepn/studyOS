import { NextResponse } from "next/server";
import { certifySemesterBootstrap } from "@/lib/study/semester-bootstrap-data";

export async function POST(){
  try{
    const data=await certifySemesterBootstrap();
    return NextResponse.json({ok:true,data});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Could not certify semester bootstrap"},{status:400});
  }
}
