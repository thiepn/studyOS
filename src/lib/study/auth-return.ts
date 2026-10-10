/** Sign-in return destinations are same-origin UI pages, never internal services.
 * This is redirect hygiene; session and row authorization remain server-owned. */
const CONTROL=/[\\\u0000-\u001f\u007f]/;
const FORBIDDEN_PREFIX=/^\/(?:api|auth|login|_next|_vercel|\.well-known)(?:\/|$)/i;
const SEGMENT_TRAVERSAL=/(?:^|\/)\.{1,2}(?:\/|$)/;

/** Validate the raw path and several levels of decoding BEFORE URL normalization.
 * Browsers and proxies may interpret percent-encoded route segments differently. */
export function safeStudyReturnPath(value:string|null|undefined):string {
  if(!value||value.length>2048||!value.startsWith("/")||value.startsWith("//"))return "/";
  if(CONTROL.test(value))return "/";
  const rawPath=value.split(/[?#]/,1)[0];
  let decoded=rawPath;
  for(let step=0;step<4;step++){
    if(CONTROL.test(decoded)||decoded.startsWith("//")||FORBIDDEN_PREFIX.test(decoded)||SEGMENT_TRAVERSAL.test(decoded))return "/";
    if(/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(decoded))return "/";
    if(!decoded.includes("%"))break;
    try{
      const next=decodeURIComponent(decoded);
      if(next===decoded)break;
      decoded=next;
    }catch{return "/";}
  }
  try{
    const base="https://studyos.invalid";
    const url=new URL(value,base);
    if(url.origin!==base||!url.pathname.startsWith("/")||FORBIDDEN_PREFIX.test(url.pathname))return "/";
    return url.pathname+url.search+url.hash;
  }catch{return "/";}
}
