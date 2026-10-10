/** Read-back must match the exact source write before offline custody can
 * change. False/null/unexpected responses are NOT proof of persistence. */
export type OfflineReceiptRequest =
  |{kind:"attempt";recordId:string;questionId:string}
  |{kind:"session_start";recordId:string;startedAt:string;sessionType:string;courseId:string|null;plannedMinutes:number}
  |{kind:"session_finish";recordId:string;endedAt:string;note:string|null};
export type ReceiptRow={
  request_id?:unknown;question_id?:unknown;response?:unknown;
  id?:unknown;started_at?:unknown;session_type?:unknown;course_id?:unknown;
  planned_minutes?:unknown;ended_at?:unknown;note?:unknown;
};
export function offlineReceiptMatches(expected:OfflineReceiptRequest,row:ReceiptRow|null):boolean{
  if(!row)return false;
  if(expected.kind==="attempt")
    return row.request_id===expected.recordId&&row.question_id===expected.questionId&&row.response!==null&&row.response!==undefined;
  if(row.id!==expected.recordId)return false;
  if(expected.kind==="session_start")
    return row.session_type===expected.sessionType
      &&(row.course_id??null)===(expected.courseId??null)
      &&row.planned_minutes===expected.plannedMinutes
      &&sameInstant(row.started_at,expected.startedAt);
  return sameInstant(row.ended_at,expected.endedAt)&&(row.note??null)===(expected.note??null);
}
function sameInstant(actual:unknown,expected:string){
  if(typeof actual!=="string"||!actual||!expected)return false;
  const a=Date.parse(actual),b=Date.parse(expected);
  return Number.isFinite(a)&&Number.isFinite(b)&&a===b;
}
export function assertOfflineReceiptResponse(
  status:number,payload:unknown,
):void{
  if(status!==200||!payload||typeof payload!=="object"||Array.isArray(payload)
    ||(payload as Record<string,unknown>).ok!==true
    ||(payload as Record<string,unknown>).recorded!==true)
    throw new Error("The authenticated study database did not confirm the exact queued record; original local evidence is retained.");
}
