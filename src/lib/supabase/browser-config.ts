/**
 * Browser-only Supabase configuration. Next.js must see literal
 * process.env.NEXT_PUBLIC_* references to inline values into the
 * production browser bundle. Never import server env here.
 */
export function getBrowserSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "StudyOS public Supabase configuration was not embedded in this build. " +
      "Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel, then rebuild.",
    );
  }
  return { url, publishableKey };
}
