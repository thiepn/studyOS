/** API requests must receive machine-readable unauthenticated responses.
 * A login-page redirect can be mistaken for a 200 OK by offline sync. */
export function isApiRoute(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}
export function isPublicHealthRoute(pathname: string): boolean {
  return pathname === "/api/health";
}
