import { createHash, randomBytes } from "node:crypto";
import { requireCalendarServerEnv } from "@/lib/env";

export const CALENDAR_LIST_SCOPE="https://www.googleapis.com/auth/calendar.calendarlist.readonly";
export const CALENDAR_READ_SCOPE="https://www.googleapis.com/auth/calendar.events.readonly";
export const CALENDAR_OWNED_SCOPE="https://www.googleapis.com/auth/calendar.events.owned";
const IDENTITY_SCOPES=["openid","email","profile"];

export function calendarScopes(){return [...IDENTITY_SCOPES,CALENDAR_LIST_SCOPE,CALENDAR_READ_SCOPE,CALENDAR_OWNED_SCOPE];}
export function createCalendarOAuthState(){
  const state=randomBytes(24).toString("base64url"); const verifier=randomBytes(48).toString("base64url");
  const challenge=createHash("sha256").update(verifier).digest("base64url"); return {state,verifier,challenge};
}
export function calendarAuthorizationUrl(state:string,challenge:string){
  const {clientId,appOrigin}=requireCalendarServerEnv();
  const params=new URLSearchParams({
    client_id:clientId,redirect_uri:appOrigin+"/api/integrations/google-calendar/callback",response_type:"code",
    scope:calendarScopes().join(" "),access_type:"offline",include_granted_scopes:"true",prompt:"consent select_account",
    state,code_challenge:challenge,code_challenge_method:"S256",
  });
  return "https://accounts.google.com/o/oauth2/v2/auth?"+params;
}
export async function exchangeCalendarCode(code:string,verifier:string){
  const {clientId,clientSecret,appOrigin}=requireCalendarServerEnv();
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,code_verifier:verifier,grant_type:"authorization_code",redirect_uri:appOrigin+"/api/integrations/google-calendar/callback"}),cache:"no-store"});
  if(!response.ok) throw new Error("Google Calendar token exchange failed ("+response.status+")");
  return response.json() as Promise<{access_token:string;refresh_token?:string;expires_in:number;scope?:string;token_type:string}>;
}
export async function fetchCalendarGoogleIdentity(accessToken:string){
  const response=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{authorization:"Bearer "+accessToken},cache:"no-store"});
  if(!response.ok) throw new Error("Google userinfo failed ("+response.status+")");
  return response.json() as Promise<{sub:string;email?:string;name?:string}>;
}
