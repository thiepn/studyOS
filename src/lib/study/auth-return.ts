/** Return paths are untrusted query strings. A slash+backslash is
 * interpreted as a cross-origin protocol-relative URL by URL parsers. */
export function safeStudyReturnPath(value: string | null | undefined): string {
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  // Reject encoded path separators and controls (including encoded backslashes).
  const pathname=value.split(/[?#]/,1)[0];
  if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(pathname)) return "/";
  try {
    const base="https://studyos.invalid";
    const url=new URL(value,base);
    if (url.origin!==base || !url.pathname.startsWith("/")) return "/";
    if (url.pathname==="/login" || url.pathname.startsWith("/auth/")) return "/";
    return url.pathname+url.search+url.hash;
  } catch {return "/";}
}
