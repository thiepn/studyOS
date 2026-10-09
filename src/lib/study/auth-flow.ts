import { safeStudyReturnPath } from "./auth-return.ts";

export const AUTH_FAILURES = {
  oauth_origin: "This address is not configured for StudyOS sign-in. Open the canonical StudyOS domain and try again.",
  oauth_start: "Google sign-in could not be started. Check your connection and try again.",
  provider_denied: "Google sign-in was cancelled or permission was declined. No account data was changed.",
  provider_error: "Google could not complete the sign-in request. Try again.",
  missing_code: "The sign-in response was incomplete. Start a new sign-in attempt.",
  oauth_callback: "The sign-in link has expired or could not be verified. Start a new sign-in attempt.",
  session_missing: "Sign-in did not establish a valid StudyOS session. Try again.",
  signout_failed: "The session could not be closed. Try signing out again.",
} as const;

export type AuthFailure = keyof typeof AUTH_FAILURES;
export function safeAuthFailure(value: unknown): AuthFailure | null {
  if (typeof value !== "string") return null;
  return Object.prototype.hasOwnProperty.call(AUTH_FAILURES, value) ? value as AuthFailure : null;
}
export function providerAuthFailure(value: string | null): AuthFailure {
  return value === "access_denied" ? "provider_denied" : "provider_error";
}
export function authLoginUrl(origin: string, code: AuthFailure, next: string | null | undefined): URL {
  const url = new URL("/login", origin);
  url.searchParams.set("error", code);
  const safeNext = safeStudyReturnPath(next);
  if (safeNext !== "/") url.searchParams.set("next", safeNext);
  return url;
}
export function authenticatedReturnUrl(origin: string, next: string | null | undefined): URL {
  return new URL(safeStudyReturnPath(next), origin);
}
export function validAuthSubmission(origin: string, requestOrigin: string, submissionOrigin: string | null): boolean {
  return requestOrigin === origin && submissionOrigin === origin;
}
