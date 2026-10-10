/** Compare the original persisted owner-scoped semester to an exact retry.
 * No same-name-but-different-date claim of successful persistence is allowed. */
export function matchingFirstSemester(existing:{
  id:string;stable_key:string;display_name:string;starts_on:string;
  ends_on:string|null;timezone:string;
}|null, submitted:{
  stableKey:string;displayName:string;startsOn:string;endsOn:string|null;timezone:string;
}):string|null{
  return existing?.stable_key===submitted.stableKey&&
    existing.display_name===submitted.displayName&&
    existing.starts_on===submitted.startsOn&&
    (existing.ends_on??null)===(submitted.endsOn??null)&&
    existing.timezone===submitted.timezone?existing.id:null;
}
