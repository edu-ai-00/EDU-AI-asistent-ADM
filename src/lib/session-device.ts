// Labels for the device a work session was recorded on (BR-Y2TJ74), shown
// next to each session in the user detail's "Čas práce" tab.
//
// The app reports English keys; every lookup falls back to the raw key so a
// value the maps do not know yet still shows up.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight off this file.

import type { RegistrationDevice, WorkSessionDevice, WorkTimeSession } from "../types/api";

export const DEVICE_PLATFORM_LABELS: Record<string, string> = {
  web: "Web",
  android: "Android",
  ios: "iOS",
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
};

export const DEVICE_TYPE_LABELS: Record<string, string> = {
  mobile: "mobil",
  tablet: "tablet",
  desktop: "PC",
};

/** "Android · mobil", "Web · PC" — or null when nothing about the device is known. */
export function deviceLabel(device: WorkSessionDevice): string | null {
  const parts = [
    device.platform ? (DEVICE_PLATFORM_LABELS[device.platform] ?? device.platform) : null,
    device.type ? (DEVICE_TYPE_LABELS[device.type] ?? device.type) : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(" · ") : null;
}

/** One row of the "Poslední relace" list: a work session, or the registration. */
export type RecentEntry =
  | { kind: "session"; session: WorkTimeSession }
  | { kind: "registration"; registration: RegistrationDevice };

/**
 * The newest [limit] rows of "Poslední relace", newest first: the work
 * sessions plus the account's registration (BR-CMA88Y). The registration has
 * no work time of its own, so it is listed but never counted — it is there so
 * a pupil who signed up and did nothing else still shows the session and the
 * device they signed up on. It sorts by its time like any session, so it
 * drops out of the list once there are [limit] newer sessions.
 */
export function recentEntries(
  sessions: WorkTimeSession[],
  registration: RegistrationDevice | null | undefined,
  limit = 10,
): RecentEntry[] {
  const entries: RecentEntry[] = sessions.map((session) => ({ kind: "session", session }));
  if (registration) entries.push({ kind: "registration", registration });

  // Parsed, not compared as strings: sessions carry the Prague offset, the
  // registration the server's.
  const time = (entry: RecentEntry) =>
    Date.parse(entry.kind === "session" ? entry.session.start : entry.registration.at);

  return entries.sort((a, b) => time(b) - time(a)).slice(0, limit);
}
