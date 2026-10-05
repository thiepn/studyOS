import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { requireCalendarServerEnv } from "@/lib/env";

function key(){
  const raw=Buffer.from(requireCalendarServerEnv().tokenKey,"base64");
  if(raw.length!==32) throw new Error("STUDY_CALENDAR_TOKEN_KEY must decode to exactly 32 bytes");
  return raw;
}
export function encryptCalendarRefreshToken(value:string){
  const iv=randomBytes(12); const cipher=createCipheriv("aes-256-gcm",key(),iv);
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]); const tag=cipher.getAuthTag();
  return ["v1",iv.toString("base64url"),tag.toString("base64url"),encrypted.toString("base64url")].join(".");
}
export function decryptCalendarRefreshToken(value:string){
  const [version,ivText,tagText,dataText]=value.split(".");
  if(version!=="v1"||!ivText||!tagText||!dataText) throw new Error("Unsupported encrypted token format");
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(ivText,"base64url"));
  decipher.setAuthTag(Buffer.from(tagText,"base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataText,"base64url")),decipher.final()]).toString("utf8");
}
