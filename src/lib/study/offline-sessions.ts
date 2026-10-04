"use client";

import type { ReviewSessionFinishInput, ReviewSessionStartInput } from "./types";
import { STUDY_SYNC_CHANGE_EVENT } from "./offline-attempts";

const START_KEY = "semester-os:pending-session-starts:v1";
const FINISH_KEY = "semester-os:pending-session-finishes:v1";

type PendingStart = ReviewSessionStartInput & { queuedAt: string };
type PendingFinish = ReviewSessionFinishInput & { queuedAt: string };

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function write<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(STUDY_SYNC_CHANGE_EVENT));
}

export function pendingSessionCount() { return read<PendingStart>(START_KEY).length + read<PendingFinish>(FINISH_KEY).length; }

export async function startSessionWithFallback(input: ReviewSessionStartInput) {
  try {
    const response = await fetch("/api/study/session/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { queued: false as const, data: await response.json() };
  } catch {
    const list = read<PendingStart>(START_KEY).filter((x) => x.sessionId !== input.sessionId);
    write(START_KEY, [...list, { ...input, queuedAt: new Date().toISOString() }].slice(-20));
    return { queued: true as const, data: null };
  }
}

export async function finishSessionWithFallback(input: ReviewSessionFinishInput) {
  try {
    const response = await fetch("/api/study/session/finish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { queued: false as const, data: await response.json() };
  } catch {
    const list = read<PendingFinish>(FINISH_KEY).filter((x) => x.sessionId !== input.sessionId);
    write(FINISH_KEY, [...list, { ...input, queuedAt: new Date().toISOString() }].slice(-20));
    return { queued: true as const, data: null };
  }
}

export async function flushPendingSessionStarts() {
  const list = read<PendingStart>(START_KEY);
  for (const item of list) {
    try {
      const response = await fetch("/api/study/session/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item) });
      if (!response.ok) throw new Error();
      write(START_KEY, read<PendingStart>(START_KEY).filter((x) => x.sessionId !== item.sessionId));
    } catch { if (typeof navigator !== "undefined" && !navigator.onLine) break; }
  }
}

export async function flushPendingSessionFinishes() {
  const list = read<PendingFinish>(FINISH_KEY);
  for (const item of list) {
    try {
      const response = await fetch("/api/study/session/finish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item) });
      if (!response.ok) throw new Error();
      write(FINISH_KEY, read<PendingFinish>(FINISH_KEY).filter((x) => x.sessionId !== item.sessionId));
    } catch { if (typeof navigator !== "undefined" && !navigator.onLine) break; }
  }
}
