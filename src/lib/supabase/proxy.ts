import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isApiRoute,isPublicHealthRoute } from "@/lib/study/api-boundary";
import { safeStudyReturnPath } from "@/lib/study/auth-return";
import { authenticatedReturnUrl } from "@/lib/study/auth-flow";
import type { Database } from "./database.types";

const PUBLIC_PREFIXES = ["/login", "/auth/"];

/** Refreshing Supabase credentials can set new cookies in the proxy response.
 * Redirects must forward those updates, otherwise an expiring session can
 * remain stale across a login guard or authenticated /login redirect. */
function redirectWithSessionCookies(destination: URL, response: NextResponse): NextResponse {
  const redirected = NextResponse.redirect(destination);
  response.cookies.getAll().forEach(cookie => redirected.cookies.set(cookie));
  for (const name of ["cache-control", "pragma", "expires"]) {
    const value = response.headers.get(name);
    if (value) redirected.headers.set(name, value);
  }
  return redirected;
}

export async function updateSession(request: NextRequest) {
  if (isPublicHealthRoute(request.nextUrl.pathname)) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        if (headers) Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(prefix));

  if (!claims && !isPublic) {
    if (isApiRoute(request.nextUrl.pathname)) {
      return NextResponse.json({ok:false,error:"Authentication required"},{
        status:401,headers:{"cache-control":"no-store"},
      });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", safeStudyReturnPath(request.nextUrl.pathname + request.nextUrl.search));
    return redirectWithSessionCookies(url, response);
  }
  if (claims && request.nextUrl.pathname === "/login") {
    return redirectWithSessionCookies(authenticatedReturnUrl(env.appOrigin, request.nextUrl.searchParams.get("next")), response);
  }
  return response;
}
