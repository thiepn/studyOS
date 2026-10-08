/** Google may grant only a subset of requested Calendar permissions. */
export const CALENDAR_LIST_SCOPE="https://www.googleapis.com/auth/calendar.calendarlist.readonly";
export const CALENDAR_READ_SCOPE="https://www.googleapis.com/auth/calendar.events.readonly";
export const CALENDAR_OWNED_SCOPE="https://www.googleapis.com/auth/calendar.events.owned";
export const REQUIRED_CALENDAR_SCOPES=[CALENDAR_LIST_SCOPE,CALENDAR_READ_SCOPE,CALENDAR_OWNED_SCOPE] as const;

export function hasRequiredCalendarScopes(scopes:string|readonly string[]|null|undefined):boolean{
  const grant=new Set(typeof scopes==="string"?scopes.split(/\s+/).filter(Boolean):Array.isArray(scopes)?scopes:[]);
  return REQUIRED_CALENDAR_SCOPES.every(scope=>grant.has(scope));
}
