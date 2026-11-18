// Dashboard banners (BR-SAWX2U) — the XP-banded strips on the app's
// dashboard, managed here instead of in the app's code.

export type DashboardBannerAccent = "primary" | "orange" | "green" | "purple";

export type DashboardBannerRole = "student" | "teacher" | "all";

export interface DashboardBanner {
  id: number;
  /** `system.*` for the seeded banners; null for ones an admin added. */
  key: string | null;
  name: string;
  is_active: boolean;
  is_system: boolean;
  position: number;
  badge: string | null;
  title: string;
  body: string;
  accent: DashboardBannerAccent;
  illustration: string | null;
  link: string | null;
  target_role: DashboardBannerRole;
  min_xp: number | null;
  max_xp: number | null;
  course_id: number | null;
  classroom_id: number | null;
  school_id: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/** What the editor sends; everything is optional on an update. */
export interface DashboardBannerInput {
  name?: string;
  title?: string;
  body?: string;
  is_active?: boolean;
  position?: number;
  badge?: string | null;
  accent?: DashboardBannerAccent;
  illustration?: string | null;
  link?: string | null;
  target_role?: DashboardBannerRole;
  min_xp?: number | null;
  max_xp?: number | null;
  course_id?: number | null;
  classroom_id?: number | null;
  school_id?: number | null;
}

export const ACCENT_LABELS: Record<string, string> = {
  primary: "Základní",
  orange: "Oranžová",
  green: "Zelená",
  purple: "Fialová",
};

export const ROLE_LABELS: Record<string, string> = {
  all: "Všem",
  student: "Žákům",
  teacher: "Učitelům a administrátorům",
};

export const ILLUSTRATION_LABELS: Record<string, string> = {
  news: "Novinky",
};

/** "0–30 XP", "31+ XP", "do 100 XP", "—" when the banner has no band. */
export function xpBandLabel(min: number | null, max: number | null): string {
  if (min === null && max === null) return "—";
  if (min === null) return `do ${max} XP`;
  if (max === null) return `${min}+ XP`;
  return `${min}–${max} XP`;
}
