"use client";

import { useEffect } from "react";
import { getSessionUser } from "@/lib/auth/session-user";
import { setSentryUser } from "@/lib/sentry/user";

/**
 * Restores the Sentry user from the session cookie when a page loads with a
 * session. Login and logout update it themselves — client-side navigation
 * keeps this mounted, so it would not notice.
 */
export function SentryUser() {
  useEffect(() => {
    setSentryUser(getSessionUser());
  }, []);

  return null;
}
