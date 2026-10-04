import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scanDrive } from "@/lib/google-drive/scan";

export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ? String(data.claims.sub) : undefined;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try { return NextResponse.json(await scanDrive(userId)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Drive scan failed" }, { status: 500 }); }
}
