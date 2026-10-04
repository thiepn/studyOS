function requiredPublic(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export const env = {
  supabaseUrl: requiredPublic("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: requiredPublic("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
  googleDriveClientId: optional("GOOGLE_DRIVE_CLIENT_ID"),
  googleDriveClientSecret: optional("GOOGLE_DRIVE_CLIENT_SECRET"),
  driveTokenKey: optional("STUDY_DRIVE_TOKEN_KEY"),
  appOrigin: optional("APP_ORIGIN") ?? "http://localhost:3000",
  googleDriveScopeMode: optional("GOOGLE_DRIVE_SCOPE_MODE") === "readonly" ? "readonly" : "file",
} as const;

export function requireServiceRoleEnv() {
  if (!env.supabaseServiceRoleKey) throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  return { serviceRoleKey: env.supabaseServiceRoleKey };
}

export function requireDriveServerEnv() {
  const missing = [
    ["SUPABASE_SERVICE_ROLE_KEY", env.supabaseServiceRoleKey],
    ["GOOGLE_DRIVE_CLIENT_ID", env.googleDriveClientId],
    ["GOOGLE_DRIVE_CLIENT_SECRET", env.googleDriveClientSecret],
    ["STUDY_DRIVE_TOKEN_KEY", env.driveTokenKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Missing Drive server environment: ${missing.join(", ")}`);
  return {
    serviceRoleKey: env.supabaseServiceRoleKey!,
    clientId: env.googleDriveClientId!,
    clientSecret: env.googleDriveClientSecret!,
    tokenKey: env.driveTokenKey!,
    appOrigin: env.appOrigin,
    scopeMode: env.googleDriveScopeMode,
  };
}
