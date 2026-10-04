import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { authorizationUrl, createOAuthState } from "@/lib/google-drive/oauth";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.redirect(new URL("/login", process.env.APP_ORIGIN ?? "http://localhost:3000"));
  const { state, verifier, challenge } = createOAuthState();
  const store = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  store.set("study_drive_oauth_state", state, options);
  store.set("study_drive_pkce", verifier, options);
  return NextResponse.redirect(authorizationUrl(state, challenge));
}
