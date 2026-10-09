"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  connected: boolean;
  email?: string | null;
  inboxUrl?: string | null;
  lastScanAt?: string | null;
  lastScanStatus?: string | null;
  lastError?: string | null;
};

export function DriveControls({ connected, email, inboxUrl, lastScanAt, lastScanStatus, lastError }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function post(path: string) {
    setBusy(path); setMessage(null);
    try {
      const response = await fetch(path, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Request failed");
      setMessage(body?.note ?? "Done.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Request failed"); }
    finally { setBusy(null); }
  }

  if (!connected) return (
    <div className="drive-card">
      <div><strong>Google Drive not connected</strong><p>Connect the Google account you want to use for university material. This is independent of your THIEPN Account login.</p></div>
      {lastError ? <p className="error" role="status">{lastError}</p> : null}
      <a className="primary-button" href="/api/integrations/google-drive/start">Connect Google Drive</a>
      <p className="muted tiny">Google will show an account chooser. StudyOS creates and uses its own StudyOS folder tree in the account you select.</p>
    </div>
  );

  return (
    <div className="drive-card">
      <div className="status-line"><strong>Google Drive connected</strong><span>{lastScanStatus ?? "ready"}</span></div>
      <p>{email ?? "Connected Google account"}</p>
      {lastScanAt ? <p className="muted">Last scan: {new Date(lastScanAt).toLocaleString()}</p> : <p className="muted">Not scanned yet.</p>}
      <div className="button-row">
        <button className="primary-button button-reset" type="button" disabled={Boolean(busy)} onClick={() => post("/api/integrations/google-drive/scan")}>{busy?.includes("scan") ? "Scanning…" : "Scan Drive now"}</button>
        {inboxUrl ? <a className="secondary-button" href={inboxUrl} target="_blank" rel="noreferrer">Open Drive inbox</a> : null}
        <button className="secondary-button button-reset" type="button" disabled={Boolean(busy)} onClick={() => post("/api/integrations/google-drive/disconnect")}>{busy?.includes("disconnect") ? "Disconnecting…" : "Disconnect"}</button>
        <a className="secondary-button" href="/account">Switch account safely</a>
      </div>
      {message ? <p className="form-message" role="status">{message}</p> : null}
    </div>
  );
}
