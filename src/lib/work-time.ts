// Time figures for the user detail: the "Celkový čas" stat in the header and
// the "Čas práce" tab (BR-9SAH2R, BR-3VDABQ).
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight off this file.

type Timed = { time_spent_seconds?: number | null };

/** Format a duration in seconds as a compact "1 h 23 min" / "45 min" / "30 s". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

const sum = (rows: Timed[] | null | undefined) =>
  (rows ?? []).reduce((acc, row) => acc + (row.time_spent_seconds ?? 0), 0);

/**
 * The user's total learning time for "Celkový čas".
 *
 * The active work time behind "Čas práce" (heartbeats on learning screens plus
 * answers) is the real figure, so whenever the API has any, the header shows
 * exactly that and the two never disagree (BR-3VDABQ). The progress timers are
 * only a fallback for accounts with no work time: the app fills them on quiz
 * completions alone — lessons stay 0 — so 14 minutes of lessons read as "0m".
 * The course-level cache mirrors quiz time, hence the max, not a sum.
 */
export function userTotalSeconds(
  user: { courses: Timed[]; quiz_attempts?: Timed[] | null; progress?: Timed[] | null },
  workTimeSeconds: number | null | undefined,
): number {
  if (workTimeSeconds && workTimeSeconds > 0) return workTimeSeconds;
  return Math.max(sum(user.courses), sum(user.quiz_attempts) + sum(user.progress));
}
