/** Explicit event ownership marker written by StudyOS event creation.
 * Never infer application ownership from a calendar event title.
 */
export function isStudyOwnedCalendarEvent(event: {
  extendedProperties?: { private?: Record<string,string> };
} | null | undefined): boolean {
  return event?.extendedProperties?.private?.studyOS === "1";
}
