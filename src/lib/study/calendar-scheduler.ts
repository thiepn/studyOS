import type { PlannedItem } from "./planner";

export type CalendarBusyEvent = {
  startAt: string;
  endAt: string;
  status?: string | null;
  transparency?: string | null;
  allDay?: boolean;
};

export type CalendarScheduleSettings = {
  timezone: string;
  dayStart: string;
  dayEnd: string;
  minimumBlockMinutes: number;
  calendarBufferMinutes: number;
  maxBlockMinutes: number;
  includeWeekends: boolean;
};

export type FreeWindow = { startAt: string; endAt: string; minutes: number };
export type ProposedStudyBlock = {
  candidateId: string;
  candidateKind: PlannedItem["kind"];
  courseId: string | null;
  title: string;
  startAt: string;
  endAt: string;
  minutes: number;
  partial: boolean;
  href: string;
};

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.get("year")), month: Number(map.get("month")), day: Number(map.get("day")),
    hour: Number(map.get("hour")), minute: Number(map.get("minute")), second: Number(map.get("second")),
  };
}

function offsetMs(date: Date, timezone: string) {
  const p = localParts(date, timezone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
}

export function zonedDateTimeToUtc(dateText: string, timeText: string, timezone: string) {
  const [year, month, day] = dateText.split("-").map(Number);
  const [hour, minute] = timeText.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) throw new Error("Invalid local date/time");
  const localUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = new Date(localUtc);
  for (let i = 0; i < 3; i += 1) guess = new Date(localUtc - offsetMs(guess, timezone));
  return guess;
}

function weekdayInZone(dateText: string, timezone: string) {
  const midday = zonedDateTimeToUtc(dateText, "12:00", timezone);
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(midday);
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
}

export function computeFreeWindows(
  dateText: string,
  busyEvents: CalendarBusyEvent[],
  settings: CalendarScheduleSettings,
): FreeWindow[] {
  const weekday = weekdayInZone(dateText, settings.timezone);
  if (!settings.includeWeekends && (weekday === "Sat" || weekday === "Sun")) return [];

  const dayStart = zonedDateTimeToUtc(dateText, settings.dayStart, settings.timezone);
  const dayEnd = zonedDateTimeToUtc(dateText, settings.dayEnd, settings.timezone);
  const bufferMs = Math.max(0, settings.calendarBufferMinutes) * 60_000;

  const blocked = busyEvents
    .filter((event) => event.status !== "cancelled" && event.transparency !== "transparent")
    .map((event) => ({
      start: new Date(Math.max(dayStart.getTime(), Date.parse(event.startAt) - bufferMs)),
      end: new Date(Math.min(dayEnd.getTime(), Date.parse(event.endAt) + bufferMs)),
    }))
    .filter((window) => Number.isFinite(window.start.getTime()) && Number.isFinite(window.end.getTime()) && window.end > window.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: Array<{ start: Date; end: Date }> = [];
  for (const item of blocked) {
    const last = merged.at(-1);
    if (!last || item.start > last.end) merged.push({ ...item });
    else if (item.end > last.end) last.end = item.end;
  }

  const free: FreeWindow[] = [];
  let cursor = dayStart;
  for (const item of merged) {
    if (item.start > cursor) {
      const minutes = minutesBetween(cursor, item.start);
      if (minutes >= settings.minimumBlockMinutes) free.push({ startAt: cursor.toISOString(), endAt: item.start.toISOString(), minutes });
    }
    if (item.end > cursor) cursor = item.end;
  }
  if (cursor < dayEnd) {
    const minutes = minutesBetween(cursor, dayEnd);
    if (minutes >= settings.minimumBlockMinutes) free.push({ startAt: cursor.toISOString(), endAt: dayEnd.toISOString(), minutes });
  }
  return free;
}

export function schedulePlanIntoWindows(
  items: PlannedItem[],
  freeWindows: FreeWindow[],
  settings: Pick<CalendarScheduleSettings, "minimumBlockMinutes" | "maxBlockMinutes">,
): { blocks: ProposedStudyBlock[]; unscheduled: PlannedItem[] } {
  const windows = freeWindows.map((window) => ({ start: new Date(window.startAt), end: new Date(window.endAt) }));
  const blocks: ProposedStudyBlock[] = [];
  const unscheduled: PlannedItem[] = [];

  for (const item of items) {
    let remaining = item.scheduledMinutes;
    let scheduled = 0;

    for (const window of windows) {
      if (remaining <= 0) break;
      const available = minutesBetween(window.start, window.end);
      if (available <= 0) continue;

      if (!item.splittable && available < remaining) continue;

      let minutes = Math.min(remaining, available, Math.max(settings.minimumBlockMinutes, settings.maxBlockMinutes));
      if (!item.splittable) minutes = remaining;
      if (item.splittable && remaining > minutes && minutes < settings.minimumBlockMinutes) continue;
      if (minutes <= 0) continue;

      const start = new Date(window.start);
      const end = new Date(start.getTime() + minutes * 60_000);
      blocks.push({
        candidateId: item.id,
        candidateKind: item.kind,
        courseId: item.courseId ?? null,
        title: item.title,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        minutes,
        partial: minutes < item.scheduledMinutes || remaining > minutes,
        href: item.href,
      });
      window.start = end;
      remaining -= minutes;
      scheduled += minutes;
      if (!item.splittable) break;
    }

    if (scheduled < item.scheduledMinutes) unscheduled.push({ ...item, scheduledMinutes: item.scheduledMinutes - scheduled, partial: true });
  }

  return { blocks, unscheduled };
}

export function clipFreeWindowsAfter(windows: FreeWindow[], notBefore: Date, minimumBlockMinutes: number, roundMinutes = 5): FreeWindow[] {
  const step = Math.max(1, roundMinutes) * 60_000;
  const rounded = new Date(Math.ceil(notBefore.getTime() / step) * step);
  return windows.flatMap((window) => {
    const start = new Date(Math.max(Date.parse(window.startAt), rounded.getTime()));
    const end = new Date(window.endAt);
    const minutes = minutesBetween(start, end);
    return minutes >= minimumBlockMinutes ? [{ startAt: start.toISOString(), endAt: end.toISOString(), minutes }] : [];
  });
}

export function freeMinutes(windows: FreeWindow[]) {
  return windows.reduce((sum, window) => sum + window.minutes, 0);
}
