function requiredPublic(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string) {
  const value = process.env[name];
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
  supabaseUrl: requiredPublic("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: requiredPublic("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseSecretKey,
  // Kept as an alias while older deployments still use the legacy name.
  supabaseServiceRoleKey: supabaseSecretKey,
  googleDriveClientId: optional("GOOGLE_DRIVE_CLIENT_ID"),
  googleDriveClientSecret: optional("GOOGLE_DRIVE_CLIENT_SECRET"),
  driveTokenKey: optional("STUDY_DRIVE_TOKEN_KEY"),
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
  const localOrigin = env.appOrigin.startsWith("http://localhost") || env.appOrigin.startsWith("http://127.0.0.1");
  const secureOrigin = env.appOrigin.startsWith("https://") || localOrigin;
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
    buildSha: env.buildSha ?? null,
  };
}
