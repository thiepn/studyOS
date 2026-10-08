import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isApiRoute,isPublicHealthRoute } from "@/lib/study/api-boundary";
import { safeStudyReturnPath } from "@/lib/study/auth-return";
import type { Database } from "./database.types";

const PUBLIC_PREFIXES = ["/login", "/auth/"];

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
    return NextResponse.redirect(url);
  }
  if (claims && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
