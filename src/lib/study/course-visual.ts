const TONE_COUNT=6;

export function courseToneClass(stableKey:string|null|undefined){
  const value=String(stableKey??"course");
  let hash=0;
  for(let i=0;i<value.length;i++)hash=((hash<<5)-hash+value.charCodeAt(i))|0;
  return "course-tone-"+(Math.abs(hash)%TONE_COUNT+1);
}

export function courseInitials(shortName:string|null|undefined,displayName:string){
  const short=String(shortName??"").trim();
  if(short)return short.slice(0,7);
  return displayName.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()??"").join("")||"Course";
}
