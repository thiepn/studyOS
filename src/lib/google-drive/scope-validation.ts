/** Google OAuth may approve identity while omitting the optional Drive grant.
 * Never represent such a token as a working Drive connection. */
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export function hasGrantedDriveFileScope(granted: string | readonly string[] | null | undefined): boolean {
  const scopes = typeof granted === "string" ? granted.split(/\s+/).filter(Boolean) :
    Array.isArray(granted) ? granted : [];
  return scopes.includes(DRIVE_FILE_SCOPE);
}

export const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

/** Default first-run consent requests exactly one non-Sign-In scope. */
export function requestedDriveScopes(mode:"file"|"readonly"="file"):string[]{
  return mode==="readonly" ? [DRIVE_FILE_SCOPE,DRIVE_READONLY_SCOPE] : [DRIVE_FILE_SCOPE];
}

export function parseDriveAboutIdentity(response:{
  user?:{permissionId?:string;emailAddress?:string};
} | null | undefined):{sub:string;email?:string}{
  const permissionId=response?.user?.permissionId;
  if(!permissionId||!/^[a-zA-Z0-9_-]+$/.test(permissionId)){
    throw new Error("Google Drive did not provide a valid account identifier");
  }
  return {sub:"drive:"+permissionId,email:response?.user?.emailAddress??undefined};
}
