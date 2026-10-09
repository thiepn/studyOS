/** These states describe server-side StudyOS authorizations, never ChatGPT connectors. */
export type Service = "drive" | "calendar";
export type ConnectionState = "connected" | "error" | "disconnected" | "missing";
export type ConnectionView = {
  service: Service;
  state: ConnectionState;
  label: string;
  detail: string;
  accountEmail: string | null;
  lastActivity: string | null;
  canRetry: boolean;
};
export function connectionView(service: Service, connection: {
  status: string; google_account_email: string | null;
  last_scan_at?: string | null; last_sync_at?: string | null;
} | null): ConnectionView {
  const state: ConnectionState = connection?.status === "connected" ? "connected"
    : connection?.status === "error" ? "error"
    : connection?.status === "disconnected" ? "disconnected" : "missing";
  const label = service === "drive" ? "Study Drive" : "Study Calendar";
  const detail = state === "connected"
    ? service === "drive" ? "Authorized in StudyOS. Course material stays in Google Drive."
      : "Authorized in StudyOS. Calendar sources can be selected independently."
    : state === "error" ? "Authorization or synchronization needs attention. Reconnect to recover; stored study data is preserved."
    : state === "disconnected" ? "Not authorized in StudyOS. This does not delete Google files, calendars or study history."
    : "No StudyOS authorization has been saved for this service.";
  return {service, state, label, detail,
    accountEmail: connection?.google_account_email ?? null,
    lastActivity: service === "drive" ? connection?.last_scan_at ?? null : connection?.last_sync_at ?? null,
    canRetry: state !== "connected",
  };
}
export function switchCheck(input:{
  previousGoogleSub: string | null | undefined;
  nextGoogleSub: string;
  approved: boolean;
  pendingCalendarBlocks?: number;
}): {allowed: boolean; reason: "confirmation_required"|"calendar_blocks_pending"|null} {
  const switching = Boolean(input.previousGoogleSub && input.previousGoogleSub !== input.nextGoogleSub);
  if (!switching) return {allowed:true, reason:null};
  if (!input.approved) return {allowed:false, reason:"confirmation_required"};
  if ((input.pendingCalendarBlocks ?? 0)>0) return {allowed:false, reason:"calendar_blocks_pending"};
  return {allowed:true, reason:null};
}
export class ConnectionSwitchError extends Error {
  constructor(readonly reason: "confirmation_required" | "calendar_blocks_pending") {
    super(switchErrorMessage(reason)); this.name = "ConnectionSwitchError";
  }
}
export function assertSwitchAllowed(input: Parameters<typeof switchCheck>[0]): void {
  const result = switchCheck(input);
  if (!result.allowed && result.reason) throw new ConnectionSwitchError(result.reason);
}
export function switchErrorMessage(reason: "confirmation_required"|"calendar_blocks_pending"): string {
  return reason==="confirmation_required"
    ? "Switching Google accounts requires explicit confirmation in StudyOS Account."
    : "Cancel or complete existing committed StudyOS calendar blocks before switching or disconnecting Calendar. Existing Google events are left unchanged.";
}
export function connectionNotice(code: string | undefined): string | null {
  const notices:Record<string,string> = {
    drive_confirmation_required: "Drive account change was not confirmed. The existing connection and files are unchanged.",
    calendar_confirmation_required: "Calendar account change was not confirmed. The existing connection and events are unchanged.",
    calendar_blocks_pending: "This Calendar connection has committed study blocks. Cancel them safely in StudyOS before changing accounts.",
    drive_setup_failed: "Drive connected, but folder preparation needs recovery. Your files were not deleted.",
    oauth_origin: "Open the canonical StudyOS address to manage connections.",
  };
  return code && Object.prototype.hasOwnProperty.call(notices,code) ? notices[code] : null;
}
