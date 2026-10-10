/** Real Calendar writes require current remote free/busy evidence and explicit consent.
 * This is evaluated on the server, not inferred from an enabled UI button.
 * It is not an authorization to release, restore or deploy StudyOS. */
export type CalendarWriteGuardInput = {
  confirmed:boolean;
  connection:null|{status:string;write_calendar_id:string|null;last_sync_at:string|null;last_sync_status:string|null;last_error:string|null};
  selectedWritableCalendar:boolean;
  proposedBlocks:number;
};
export type CalendarWriteGuardResult = {allowed:true;reason:null}|{allowed:false;reason:string};
export function calendarWriteAdmission(input:CalendarWriteGuardInput,nowMs=Date.now()):CalendarWriteGuardResult{
  if(!input.confirmed)return {allowed:false,reason:"Review and explicitly confirm the proposed Calendar events."};
  if(!input.connection||input.connection.status!=="connected"||!input.connection.write_calendar_id)
    return {allowed:false,reason:"Connect an owned writable Google Calendar before scheduling."};
  if(!input.selectedWritableCalendar)
    return {allowed:false,reason:"Select the owned write calendar and sync the selected sources before scheduling."};
  if(input.connection.last_sync_status!=="ok"||input.connection.last_error||!input.connection.last_sync_at)
    return {allowed:false,reason:"Sync the selected calendars successfully before scheduling."};
  const last=Date.parse(input.connection.last_sync_at);
  if(!Number.isFinite(nowMs)||!Number.isFinite(last)||last>nowMs||nowMs-last>6*60*60*1000)
    return {allowed:false,reason:"Calendar free/busy evidence is missing, future-dated or more than six hours old."};
  if(!Number.isSafeInteger(input.proposedBlocks)||input.proposedBlocks<=0)
    return {allowed:false,reason:"No reviewed study blocks are available for Calendar creation."};
  return {allowed:true,reason:null};
}
