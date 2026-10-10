"use client";

/** The server validates the POST origin and session independently.
 * This is a user-facing confirmation, not a new authorization mechanism. */
export function AccountSessionActions(){
  return <details className="account-session-review">
    <summary>Sign out or use a different THIEPN Account</summary>
    <p>Signing out ends this StudyOS browser session. It does not disconnect the separate Google Drive or Calendar authorizations, delete academic records, or transfer them to another THIEPN Account.</p>
    <p>Offline work is owner-scoped. If you have unsynced study attempts or sessions, reconnect and synchronize them under this same THIEPN Account before switching identity. Work cannot be replayed into a different owner's account.</p>
    <form action="/auth/signout" method="post">
      <button type="submit" className="secondary-button button-reset">Confirm StudyOS sign-out</button>
    </form>
  </details>;
}
