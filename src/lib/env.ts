import { isQualifiedAppOrigin } from "@/lib/study/origin-qualification";
// Next.js inlines NEXT_PUBLIC_* values only when accessed by their literal
// property names. process.env[name] is not replaced in browser bundles.
function requiredPublic(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  value: string | undefined,
) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string) {
  // This shared module is imported by both server code and browser code.
  // Optional server-only settings must not require a Node process in browsers.
  const value = typeof process === "undefined" ? undefined : process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function originFromEnvironment() {
  const explicit = optional("APP_ORIGIN");
  if (explicit) return explicit.replace(/\/$/, "");
  const productionUrl = optional("VERCEL_PROJECT_PRODUCTION_URL");
  if (productionUrl) return `https://${productionUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

const supabaseSecretKey = optional("SUPABASE_SECRET_KEY") ?? optional("SUPABASE_SERVICE_ROLE_KEY");

export const env = {
  supabaseUrl: requiredPublic("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: requiredPublic("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  supabaseSecretKey,
  // Kept as an alias while older deployments still use the legacy name.
  supabaseServiceRoleKey: supabaseSecretKey,
  googleDriveClientId: optional("GOOGLE_DRIVE_CLIENT_ID"),
  googleDriveClientSecret: optional("GOOGLE_DRIVE_CLIENT_SECRET"),
  driveTokenKey: optional("STUDY_DRIVE_TOKEN_KEY"),
  googleCalendarClientId: optional("GOOGLE_CALENDAR_CLIENT_ID") ?? optional("GOOGLE_DRIVE_CLIENT_ID"),
  googleCalendarClientSecret: optional("GOOGLE_CALENDAR_CLIENT_SECRET") ?? optional("GOOGLE_DRIVE_CLIENT_SECRET"),
  calendarTokenKey: optional("STUDY_CALENDAR_TOKEN_KEY") ?? optional("STUDY_DRIVE_TOKEN_KEY"),
  openaiApiKey: optional("OPENAI_API_KEY"),
  studyOsAiModel: optional("STUDYOS_AI_MODEL") ?? "gpt-6-luna",
  studyOsAiEnabled: optional("STUDYOS_AI_ENABLED") === "true",
  appOrigin: originFromEnvironment(),
  googleDriveScopeMode: optional("GOOGLE_DRIVE_SCOPE_MODE") === "readonly" ? "readonly" : "file",
  deploymentEnv: optional("VERCEL_ENV") ?? (process.env.NODE_ENV === "production" ? "production" : "development"),
  buildSha: optional("VERCEL_GIT_COMMIT_SHA"),
} as const;

export function requireServiceRoleEnv() {
  if (!env.supabaseSecretKey) throw new Error("Missing required environment variable: SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)");
  return { serviceRoleKey: env.supabaseSecretKey };
}

export function requireDriveServerEnv() {
  const missing = [
    ["SUPABASE_SECRET_KEY", env.supabaseSecretKey],
    ["GOOGLE_DRIVE_CLIENT_ID", env.googleDriveClientId],
    ["GOOGLE_DRIVE_CLIENT_SECRET", env.googleDriveClientSecret],
    ["STUDY_DRIVE_TOKEN_KEY", env.driveTokenKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Missing Drive server environment: ${missing.join(", ")}`);
  return {
    serviceRoleKey: env.supabaseSecretKey!,
    clientId: env.googleDriveClientId!,
    clientSecret: env.googleDriveClientSecret!,
    tokenKey: env.driveTokenKey!,
    appOrigin: env.appOrigin,
    scopeMode: env.googleDriveScopeMode,
  };
}

export function serverConfigurationStatus() {
  const secureOrigin=isQualifiedAppOrigin(env.appOrigin,env.deploymentEnv);
  return {
    deploymentEnv: env.deploymentEnv,
    appOrigin: env.appOrigin,
    secureOrigin,
    hasSupabaseSecret: Boolean(env.supabaseSecretKey),
    hasGoogleDriveClientId: Boolean(env.googleDriveClientId),
    hasGoogleDriveClientSecret: Boolean(env.googleDriveClientSecret),
    hasDriveTokenKey: Boolean(env.driveTokenKey),
    googleDriveConfigured: Boolean(env.googleDriveClientId && env.googleDriveClientSecret && env.driveTokenKey),
    authCallbackUrl: `${env.appOrigin}/auth/callback`,
    googleDriveCallbackUrl: `${env.appOrigin}/api/integrations/google-drive/callback`,
    googleCalendarConfigured: Boolean(env.googleCalendarClientId && env.googleCalendarClientSecret && env.calendarTokenKey),
    googleCalendarCallbackUrl: `${env.appOrigin}/api/integrations/google-calendar/callback`,
    buildSha: env.buildSha ?? null,
  };
}


export function requireCalendarServerEnv() {
  const missing = [
    ["SUPABASE_SECRET_KEY", env.supabaseSecretKey],
    ["GOOGLE_CALENDAR_CLIENT_ID", env.googleCalendarClientId],
    ["GOOGLE_CALENDAR_CLIENT_SECRET", env.googleCalendarClientSecret],
    ["STUDY_CALENDAR_TOKEN_KEY", env.calendarTokenKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error("Missing Calendar server environment: " + missing.join(", "));
  return {
    serviceRoleKey: env.supabaseSecretKey!,
    clientId: env.googleCalendarClientId!,
    clientSecret: env.googleCalendarClientSecret!,
    tokenKey: env.calendarTokenKey!,
    appOrigin: env.appOrigin,
  };
}
