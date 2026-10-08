import { createHash, randomBytes } from "node:crypto";
import { requireDriveServerEnv } from "@/lib/env";

import { DRIVE_FILE_SCOPE } from "./scope-validation";
export { DRIVE_FILE_SCOPE } from "./scope-validation";
export const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const IDENTITY_SCOPES = ["openid", "email", "profile"];

export function driveScopes() {
  const { scopeMode } = requireDriveServerEnv();
  return [...IDENTITY_SCOPES, DRIVE_FILE_SCOPE, ...(scopeMode === "readonly" ? [DRIVE_READONLY_SCOPE] : [])];
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
    include_granted_scopes: "true",
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

export async function fetchGoogleIdentity(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google userinfo failed (${response.status})`);
  return response.json() as Promise<{ sub: string; email?: string; name?: string }>;
}
