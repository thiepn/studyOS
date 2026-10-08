/** Google OAuth may approve identity while omitting the optional Drive grant.
 * Never represent such a token as a working Drive connection. */
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export function hasGrantedDriveFileScope(granted: string | readonly string[] | null | undefined): boolean {
  const scopes = typeof granted === "string" ? granted.split(/\s+/).filter(Boolean) :
    Array.isArray(granted) ? granted : [];
  return scopes.includes(DRIVE_FILE_SCOPE);
}
