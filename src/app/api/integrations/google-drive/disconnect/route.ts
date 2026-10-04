import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { disconnectDrive } from "@/lib/google-drive/connection";

export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ? String(data.claims.sub) : undefined;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  await disconnectDrive(userId);
  return NextResponse.json({ ok: true });
}
