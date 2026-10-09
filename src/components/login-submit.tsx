"use client";

import { useState } from "react";
import styles from "@/app/login/login.module.css";

export function LoginSubmit({ next }: { next: string }) {
  const [connecting, setConnecting] = useState(false);
  return (
    <form action="/auth/google" method="get" onSubmit={() => setConnecting(true)}>
      <input type="hidden" name="next" value={next}/>
      <button type="submit" className={styles.googleButton} aria-disabled={connecting}>
        <span className={styles.googleGlyph} aria-hidden="true">G</span>
        <span>{connecting ? "Opening Google sign-in…" : "Continue with Google"}</span>
        <span aria-hidden="true" className={styles.buttonArrow}>↗</span>
      </button>
    </form>
  );
}
