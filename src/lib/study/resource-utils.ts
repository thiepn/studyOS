export function extractGoogleDriveFileId(value: string) {
  const input = value.trim();
  if (!input) return null;
  if (/^[A-Za-z0-9_-]{20,}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (!new Set(["drive.google.com", "docs.google.com"]).has(url.hostname)) return null;
    const dMatch = url.pathname.match(/\/d\/([A-Za-z0-9_-]+)/);
    if (dMatch?.[1]) return dMatch[1];
    const id = url.searchParams.get("id");
    return id && /^[A-Za-z0-9_-]{20,}$/.test(id) ? id : null;
  } catch { return null; }
}
