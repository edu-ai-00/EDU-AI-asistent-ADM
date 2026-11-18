// Who a browser Sentry event happened to: the signed-in staff member from the
// `edu-admin-user` cookie (lib/auth/session-user.ts). Set on login and when a
// page loads with a session (SentryUser in Providers), cleared on logout.

import * as Sentry from "@sentry/nextjs";
import type { AdminUser } from "@/lib/auth/session-user";

/** The id and e-mail identify the user; the name stays out of Sentry. */
export function sentryUserFor(user: AdminUser): { id: string; email: string } {
  return { id: String(user.id), email: user.email };
}

export function setSentryUser(user: AdminUser | null): void {
  if (!user) {
    Sentry.setUser(null);
    Sentry.setTag("role", undefined);
    return;
  }
  Sentry.setUser(sentryUserFor(user));
  // A tag, so issues can be filtered by admin vs teacher.
  Sentry.setTag("role", user.role);
}
