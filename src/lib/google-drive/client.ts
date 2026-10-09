import { createAdminClient } from "@/lib/supabase/admin";
import { decryptRefreshToken } from "./crypto";
import { requireDriveServerEnv } from "@/lib/env";
import { hasGrantedDriveFileScope } from "./scope-validation";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
};

export async function refreshDriveAccessToken(userId: string) {
  const admin = createAdminClient();
  const { data: connection, error: connectionError } = await admin.from("study_drive_connections")
    .select("status,scopes").eq("user_id",userId).maybeSingle();
  if(connectionError || connection?.status!=="connected" || !hasGrantedDriveFileScope(connection.scopes))
    throw new Error("Drive access is not authorized. Reconnect and grant Drive file access.");
  const { data, error } = await admin.from("study_drive_credentials").select("encrypted_refresh_token").eq("user_id", userId).single();
  if (error || !data?.encrypted_refresh_token) throw new Error("Google Drive refresh token is unavailable");
  const { clientId, clientSecret } = requireDriveServerEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptRefreshToken(data.encrypted_refresh_token),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if(!response.ok){
    const failure=await response.json().catch(()=>null) as {error?:string}|null;
    if(failure?.error==="invalid_grant"){
      const {error:stateError}=await admin.from("study_drive_connections").update({
        status:"error",last_error:"Google Drive authorization has expired or was revoked. Reconnect Drive.",
        updated_at:new Date().toISOString(),
      }).eq("user_id",userId);
      if(stateError)throw new Error("Could not record expired Google Drive authorization");
      throw new Error("Google Drive authorization expired or was revoked. Reconnect Drive.");
    }
    throw new Error(`Google Drive token refresh failed (${response.status})`);
  }
  const payload = await response.json() as { access_token: string };
  return payload.access_token;
}

async function driveFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Drive API ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export async function createFolder(accessToken: string, name: string, parentId?: string) {
  return driveFetch<DriveFile>(accessToken, "files?fields=id,name,mimeType,parents,webViewLink", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parentId ? { parents: [parentId] } : {}) }),
  });
}

export async function listChildren(accessToken: string, folderId: string) {
  const q = encodeURIComponent(`'${folderId.replaceAll("'", "\\'")}' in parents and trashed=false`);
  const fields = encodeURIComponent("nextPageToken,files(id,name,mimeType,parents,size,createdTime,modifiedTime,webViewLink)");
  const files: DriveFile[] = [];
  let pageToken = "";
  do {
    const suffix = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const payload = await driveFetch<{ files?: DriveFile[]; nextPageToken?: string }>(accessToken, `files?q=${q}&pageSize=1000&fields=${fields}${suffix}`);
    files.push(...(payload.files ?? []));
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);
  return files;
}

export async function downloadDriveFile(accessToken: string, file: DriveFile) {
  if (file.mimeType === "application/vnd.google-apps.document") {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text%2Fplain`, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!response.ok) throw new Error(`Drive export failed (${response.status})`);
    return { bytes: Buffer.from(await response.arrayBuffer()), mimeType: "text/plain" };
  }
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Drive download failed (${response.status})`);
  return { bytes: Buffer.from(await response.arrayBuffer()), mimeType: file.mimeType };
}
