/** Positive HTTP status alone does not mean an attempt was recorded.
 * A redirected login page or another 200 HTML response is NEVER evidence. */
export class StudySyncError extends Error {
  readonly permanent: boolean;
  readonly authRequired: boolean;
  constructor(message: string, permanent: boolean, authRequired=false) {
    super(message); this.name="StudySyncError";
    this.permanent=permanent; this.authRequired=authRequired;
  }
}
export async function readStudyMutationResponse(response: Response): Promise<unknown> {
  const type=response.headers.get("content-type")??"";
  const loginRedirect=response.redirected && /\/login(?:\?|$)/.test(new URL(response.url).pathname);
  if(loginRedirect || response.status===401 || response.status===403) {
    throw new StudySyncError("Your sign-in expired. Sign in again before saving or syncing study work.",true,true);
  }
  const permanent=response.status>=400 && response.status<500 && response.status!==429;
  let payload:unknown=null;
  if(type.includes("application/json")) {
    try { payload=await response.json(); } catch { /* Treat corrupt response as unconfirmed. */ }
  }
  if(response.ok && payload && typeof payload==="object" && !Array.isArray(payload)
     && (payload as Record<string,unknown>).ok===true) return payload;
  const reported=payload && typeof payload==="object" && !Array.isArray(payload)
    ? (payload as Record<string,unknown>).error : null;
  throw new StudySyncError(
    typeof reported==="string" && reported.length<300 ? reported :
    permanent ? `Study server rejected the request (HTTP ${response.status}).` :
    "Study server did not confirm the write. Your work was not recorded as saved.",
    permanent,
  );
}
