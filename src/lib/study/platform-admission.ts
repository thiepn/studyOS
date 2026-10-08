import {isQualifiedAppOrigin} from "./origin-qualification.ts";

export type StudyOSPlatformConfig = {
  deploymentEnv:string;
  appOrigin:string;
  publicSupabaseUrl:string;
  expectedSupabaseProjectRef:string;
  hasSupabasePublishableKey:boolean;
  hasSupabaseSecret:boolean;
  googleDriveConfigured:boolean;
  googleCalendarConfigured:boolean;
  buildSha:string|null;
};

export type PlatformGate = {id:string;name:string;ready:boolean;detail:string};

export function evaluatePlatformAdmission(config:StudyOSPlatformConfig):{
  coreReady:boolean;integrationsReady:boolean;releaseReady:boolean;gates:PlatformGate[];
}{
  const expected=`https://${config.expectedSupabaseProjectRef}.supabase.co`;
  const originReady=isQualifiedAppOrigin(config.appOrigin,config.deploymentEnv);
  const httpsApi=config.publicSupabaseUrl===expected;
  const isHosted=config.deploymentEnv==="production" || config.deploymentEnv==="preview";
  const gates:PlatformGate[]=[
    {id:"origin",name:"Canonical application URL",ready:originReady,
      detail:originReady?"Valid origin for this runtime":"Configure APP_ORIGIN to the real HTTPS deployment host; localhost cannot certify production"},
    {id:"supabase",name:"Correct THIEPN Account database",ready:httpsApi,
      detail:httpsApi?"Expected account database selected":"The public URL must refer to the StudyOS/THIEPN Account project, not THIEPN Core"},
    {id:"publishable",name:"Supabase public key",ready:config.hasSupabasePublishableKey,
      detail:config.hasSupabasePublishableKey?"Public client configured":"Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for this project"},
    {id:"secret",name:"Supabase server credential",ready:config.hasSupabaseSecret,
      detail:config.hasSupabaseSecret?"Server-side key configured (value hidden)":"Configure a server-only SUPABASE_SECRET_KEY for Google integrations"},
    {id:"drive",name:"Study Drive OAuth",ready:config.googleDriveConfigured,
      detail:config.googleDriveConfigured?"OAuth client and token encryption key present":"Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET and STUDY_DRIVE_TOKEN_KEY"},
    {id:"calendar",name:"Study Calendar OAuth",ready:config.googleCalendarConfigured,
      detail:config.googleCalendarConfigured?"OAuth client and token encryption key present":"Configure Google Calendar OAuth and encrypted token storage"},
    {id:"build",name:"Traceable deployment commit",ready:Boolean(config.buildSha)||!isHosted,
      detail:config.buildSha?"Deployment commit identified":isHosted?"No Vercel Git commit SHA exposed":"Local development is not a deployment certification"},
  ];
  const coreReady=gates.slice(0,3).every(g=>g.ready);
  const integrationsReady=gates.slice(3,6).every(g=>g.ready);
  return {coreReady,integrationsReady,releaseReady:coreReady&&integrationsReady&&gates[6].ready,gates};
}

/** Account OAuth callbacks should never be computed from a request Host header. */
export function accountOAuthCallback(origin:string,returnPath:string):string {
  return new URL(`/auth/callback?next=${encodeURIComponent(returnPath)}`,origin).toString();
}
