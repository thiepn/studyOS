"use client";
import { createClient } from "@/lib/supabase/client";

/** This ID is ONLY an offline storage namespace, NEVER authorization.
 * The server independently checks the authenticated account and RLS. */
export async function currentPendingOwner():Promise<string|null> {
  try {
    const {data,error}=await createClient().auth.getSession();
    if(error)return null;
    return data.session?.user?.id ?? null;
  } catch{return null;}
}

export { canReplayPending } from "./offline-owner-policy";