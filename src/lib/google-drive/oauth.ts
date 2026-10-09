import { createHash, randomBytes } from "node:crypto";
import { requireDriveServerEnv } from "@/lib/env";

import { requestedDriveScopes, parseDriveAboutIdentity } from "./scope-validation";
export { DRIVE_FILE_SCOPE, DRIVE_READONLY_SCOPE } from "./scope-validation";
export function driveScopes() {
  const { scopeMode } = requireDriveServerEnv();
  // No OIDC scopes required: Drive about.get provides account identity.
  return requestedDriveScopes(scopeMode);
}

export function createOAuthState() {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function authorizationUrl(state: string, challenge: string) {
  const { clientId, appOrigin } = requireDriveServerEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appOrigin}/api/integrations/google-drive/callback`,
    response_type: "code",
    scope: driveScopes().join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string, verifier: string) {
  const { clientId, clientSecret, appOrigin } = requireDriveServerEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret, code, code_verifier: verifier,
      grant_type: "authorization_code", redirect_uri: `${appOrigin}/api/integrations/google-drive/callback`,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status})`);
  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope?: string; token_type: string; id_token?: string }>;
}

/** Google Drive's about.get supports drive.file without OIDC scopes.
 * permissionId is a stable Drive-account identifier, not a Google OIDC sub.
 * The prefix prevents confusing different identifier namespaces.
 */
export async function fetchDriveAccountIdentity(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/drive/v3/about?fields=user(permissionId,emailAddress)",
    { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );
  if (!response.ok) throw new Error("Could not identify authorized Google Drive account ("+response.status+")");
  const data = await response.json() as { user?: { permissionId?:string;emailAddress?:string } };
  return parseDriveAboutIdentity(data);
}
