export interface DebugReportListItem {
  id: number;
  user: { id: number; name: string; email: string } | null;
  app_version: string;
  platform: string;
  os_version: string;
  device_model: string;
  created_at: string;
}

export interface DebugReportData {
  app?: { version?: string; build_number?: string };
  device?: { platform?: string; is_web?: boolean };
  auth?: { is_authenticated?: boolean; has_token?: boolean };
  user?: { id?: number; email?: string; name?: string; is_guest?: boolean };
  user_stats?: {
    level?: number;
    xp?: number;
    streak?: number;
    achievements?: number;
    [key: string]: unknown;
  };
  connectivity?: string;
  database?: {
    courses_count?: number;
    user_courses_count?: number;
    courses?: unknown[];
    user_courses?: unknown[];
    [key: string]: unknown;
  };
  sync?: {
    state?: string;
    last_sync?: string;
    next_sync?: string;
    pending_count?: number;
    queue?: unknown[];
    [key: string]: unknown;
  };
  elo?: {
    profil_elo?: number[];
    profil_pocet?: number[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DebugReportDetail extends DebugReportListItem {
  report_data: DebugReportData;
}

export interface DebugReportsResponse {
  data: DebugReportListItem[];
  meta: { total: number; current_page: number; last_page: number };
}
