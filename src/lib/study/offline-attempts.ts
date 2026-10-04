"use client";

import type { AttemptInput } from "./types";

const KEY = "semester-os:pending-attempts:v2";
const CHANGE_EVENT = "semester-os:sync-changed";

export type PendingAttempt = AttemptInput & { clientId: string; queuedAt: string };

function storageAvailable() { return typeof window !== "undefined" && typeof localStorage !== "undefined"; }
function changed() { if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT)); }

export function listPendingAttempts(): PendingAttempt[] {
  if (!storageAvailable()) return [];
  try { const value = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

export function enqueueAttempt(input: AttemptInput): PendingAttempt {
  const clientRequestId = input.clientRequestId ?? crypto.randomUUID();
  const pending: PendingAttempt = { ...input, clientRequestId, completedAt: input.completedAt ?? new Date().toISOString(), clientId: clientRequestId, queuedAt: new Date().toISOString() };
  const withoutDuplicate = listPendingAttempts().filter((x) => x.clientId !== pending.clientId);
  localStorage.setItem(KEY, JSON.stringify([...withoutDuplicate, pending].slice(-100)));
  changed();
  return pending;
}

export function removePendingAttempt(clientId: string) {
  if (!storageAvailable()) return;
  localStorage.setItem(KEY, JSON.stringify(listPendingAttempts().filter((attempt) => attempt.clientId !== clientId)));
  changed();
}

async function postAttempt(attempt: AttemptInput) {
  return fetch("/api/study/attempt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(attempt) });
}

export async function submitAttemptWithFallback(input: AttemptInput) {
  const normalized: AttemptInput = { ...input, clientRequestId: input.clientRequestId ?? crypto.randomUUID(), completedAt: input.completedAt ?? new Date().toISOString() };
  try {
    const response = await postAttempt(normalized);
    if (response.ok) return { ok: true as const, queued: false as const, data: await response.json() };
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      const body = await response.json().catch(() => ({}));
      throw Object.assign(new Error(body?.error || `HTTP ${response.status}`), { permanent: true });
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    if ((error as { permanent?: boolean })?.permanent) throw error;
    const pending = enqueueAttempt(normalized);
    return { ok: true as const, queued: true as const, data: null, pending };
  }
}

export async function flushPendingAttempts() {
  const queue = listPendingAttempts();
  const results: { clientId: string; ok: boolean }[] = [];
  for (const attempt of queue) {
    try {
      const response = await postAttempt(attempt);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      removePendingAttempt(attempt.clientId);
      results.push({ clientId: attempt.clientId, ok: true });
    } catch {
      results.push({ clientId: attempt.clientId, ok: false });
      if (typeof navigator !== "undefined" && !navigator.onLine) break;
    }
  }
  return results;
}

export { CHANGE_EVENT as STUDY_SYNC_CHANGE_EVENT };
